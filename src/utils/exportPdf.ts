import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { stripUnsupportedColorsFromClone } from "@/utils/html2canvas-oklab-fix";

type Html2CanvasOpts = NonNullable<Parameters<typeof html2canvas>[1]>;

let sharedCanvasCtx: CanvasRenderingContext2D | null = null;
function getSafeColor(val: any): any {
  if (typeof val !== "string") return val;
  const lower = val.toLowerCase();
  if (
    lower.includes("oklab") ||
    lower.includes("oklch") ||
    lower.includes("color-mix") ||
    lower.includes("hwb") ||
    lower.includes("color(")
  ) {
    if (!sharedCanvasCtx && typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      sharedCanvasCtx = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (sharedCanvasCtx) {
      sharedCanvasCtx.clearRect(0, 0, 1, 1);
      sharedCanvasCtx.fillStyle = "rgba(0,0,0,0)";
      sharedCanvasCtx.fillStyle = val;
      sharedCanvasCtx.fillRect(0, 0, 1, 1);
      const data = sharedCanvasCtx.getImageData(0, 0, 1, 1).data;
      return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
    }
    return "rgba(0,0,0,1)";
  }
  return val;
}

async function capturePage(el: HTMLElement, opts: Html2CanvasOpts) {
  if (typeof window === "undefined") return html2canvas(el, opts);
  
  const origGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (element: Element, pseudoElt?: string | null) {
    const style = origGetComputedStyle(element, pseudoElt);
    return new Proxy(style, {
      get(target: any, prop: string | symbol, receiver: any) {
        const val = target[prop as keyof typeof target];
        if (typeof val === "function") {
          return function (...args: any[]) {
            const res = val.apply(target, args);
            return getSafeColor(res);
          };
        }
        return getSafeColor(val);
      },
    });
  };

  try {
    return await html2canvas(el, opts);
  } finally {
    window.getComputedStyle = origGetComputedStyle;
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

function canvasLooksBlank(canvas: HTMLCanvasElement): boolean {
  if (!canvas.width || !canvas.height) return true;
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  try {
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const stepX = Math.max(1, Math.floor(width / 40));
    const stepY = Math.max(1, Math.floor(height / 40));
    let nonWhite = 0;
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 0 && (r < 245 || g < 245 || b < 245)) {
          nonWhite += 1;
          if (nonWhite > 10) return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Captures each `[data-quotation-page]` node inside `root` and merges into one A4 PDF.
 * Pages are landscape A4 (same pixel layout as the on-screen quotation pages).
 *
 * **Note:** Capture `root` that is not inside a CSS `transform: scale(...)` ancestor — scaled
 * previews often produce blank PDFs or tainted canvases with html2canvas.
 */
export async function exportQuotationPdf(
  root: HTMLElement,
  fileName = "quotation.pdf",
  pageSetup?: {
    format?: "a4" | "letter";
    orientation?: "portrait" | "landscape";
  }
): Promise<void> {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-quotation-page]")
  );
  if (nodes.length === 0) {
    throw new Error("No quotation pages found to export.");
  }

  const pdf = new jsPDF({
    orientation: pageSetup?.orientation ?? "landscape",
    unit: "mm",
    format: pageSetup?.format ?? "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const baseOpts: Html2CanvasOpts = {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 20_000,
    scale: 2,
  };

  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) pdf.addPage();
    const el = nodes[i];
    const optsWithClone: Html2CanvasOpts = {
      ...baseOpts,
      onclone(clonedDoc, clonedEl) {
        stripUnsupportedColorsFromClone(clonedDoc, clonedEl, el);
      },
    };
    let canvas: HTMLCanvasElement;
    try {
      canvas = await capturePage(el, optsWithClone);
    } catch {
      canvas = await capturePage(el, { ...optsWithClone, scale: 1 });
    }
    let imgData: string;
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.92);
    } catch {
      throw new Error(
        "PDF export blocked (canvas). Try a smaller logo image or a different browser."
      );
    }
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  pdf.save(fileName);
}

/**
 * Renders a single invoice node (`#invoice-print-root`) to a **single-page A4 portrait** PDF.
 * The captured preview is fitted proportionally inside A4 with margins.
 */
export async function exportInvoicePdf(
  invoiceRoot: HTMLElement,
  fileName = "invoice.pdf"
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const margin = 0;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const baseOpts: Html2CanvasOpts = {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 20_000,
    scale: Math.max(2, Number(window.devicePixelRatio) || 1),
    windowWidth: invoiceRoot.scrollWidth,
    windowHeight: invoiceRoot.scrollHeight,
    width: invoiceRoot.scrollWidth,
    height: invoiceRoot.scrollHeight,
    foreignObjectRendering: false,
  };

  // Capture from an isolated A4 clone so export does not depend on responsive grid width.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.height = "auto";
  host.style.margin = "0";
  host.style.padding = "0";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";

  const clone = invoiceRoot.cloneNode(true) as HTMLElement;
  clone.style.width = "210mm";
  clone.style.maxWidth = "210mm";
  clone.style.minHeight = "297mm";
  clone.style.margin = "0";
  clone.style.padding = "0";
  clone.style.boxSizing = "border-box";
  clone.style.transform = "none";
  clone.style.background = "#ffffff";
  host.appendChild(clone);
  document.body.appendChild(host);

  await waitForImages(clone);
  await waitForImages(invoiceRoot);

  let canvas: HTMLCanvasElement | null = null;
  let lastError: unknown = null;
  try {
    const attempts: Array<{
      target: HTMLElement;
      scale: number;
      foreignObjectRendering: boolean;
      forceA4: boolean;
    }> = [
      // First try exact visible preview (WYSIWYG).
      { target: invoiceRoot, scale: baseOpts.scale as number, foreignObjectRendering: false, forceA4: false },
      { target: invoiceRoot, scale: 1, foreignObjectRendering: false, forceA4: false },
      // Then fallback to stable A4 clone.
      { target: clone, scale: baseOpts.scale as number, foreignObjectRendering: false, forceA4: true },
      { target: clone, scale: 1, foreignObjectRendering: false, forceA4: true },
    ];
    for (const attempt of attempts) {
      try {
        const c = await capturePage(attempt.target, {
          ...baseOpts,
          scale: attempt.scale,
          foreignObjectRendering: attempt.foreignObjectRendering,
          windowWidth: attempt.target.scrollWidth,
          windowHeight: attempt.target.scrollHeight,
          width: attempt.target.scrollWidth,
          height: attempt.target.scrollHeight,
          onclone(clonedDoc, clonedEl) {
            stripUnsupportedColorsFromClone(clonedDoc, clonedEl, attempt.target);
            const cloneRoot = clonedEl as HTMLElement;
            if (attempt.forceA4) {
              cloneRoot.style.width = "210mm";
              cloneRoot.style.maxWidth = "210mm";
              cloneRoot.style.minHeight = "297mm";
            } else {
              cloneRoot.style.width = `${attempt.target.scrollWidth}px`;
              cloneRoot.style.maxWidth = `${attempt.target.scrollWidth}px`;
              cloneRoot.style.minHeight = `${attempt.target.scrollHeight}px`;
            }
            cloneRoot.style.margin = "0";
            cloneRoot.style.padding = "0";
            cloneRoot.style.boxSizing = "border-box";
            cloneRoot.style.transform = "none";
            cloneRoot.style.background = "#ffffff";
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.body.style.background = "#ffffff";
          },
        });
        if (canvasLooksBlank(c)) {
          throw new Error("Captured canvas was blank");
        }
        canvas = c;
        break;
      } catch (err) {
        lastError = err;
      }
    }
  } finally {
    host.remove();
  }
  if (!canvas) {
    throw new Error(
      lastError instanceof Error
        ? `PDF render failed: ${lastError.message}`
        : "PDF render failed. Please try again."
    );
  }

  let imgData: string;
  try {
    // PNG avoids JPEG compression artifacts (dark hairlines on thin borders/text).
    imgData = canvas.toDataURL("image/png");
  } catch {
    throw new Error(
      "Could not build PDF (browser blocked the image). Use Print → Save as PDF, or try a smaller logo."
    );
  }

  const imgAspect = canvas.width / canvas.height;
  const boxAspect = contentW / contentH;
  const renderW = imgAspect > boxAspect ? contentW : contentH * imgAspect;
  const renderH = imgAspect > boxAspect ? contentW / imgAspect : contentH;
  const x = margin + (contentW - renderW) / 2;
  const y = margin + (contentH - renderH) / 2;
  pdf.addImage(imgData, "PNG", x, y, renderW, renderH);

  pdf.save(fileName);
}
