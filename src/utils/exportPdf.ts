import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { stripUnsupportedColorsFromClone } from "@/utils/html2canvas-oklab-fix";

type Html2CanvasOpts = NonNullable<Parameters<typeof html2canvas>[1]>;

async function capturePage(el: HTMLElement, opts: Html2CanvasOpts) {
  return html2canvas(el, opts);
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
