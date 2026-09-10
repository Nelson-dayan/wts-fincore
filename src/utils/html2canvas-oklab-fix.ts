/**
 * html2canvas 1.x cannot parse modern CSS color functions (lab/oklab/lch/oklch, etc.).
 * We strip cloned document stylesheets and inline computed styles in sRGB form.
 */

function colorNeedsSanitize(value: string): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return (
    v.includes("oklab") ||
    v.includes("oklch") ||
    v.includes("lab(") ||
    v.includes("lch(") ||
    v.includes("color-mix") ||
    v.includes("hwb(") ||
    v.includes("color(")
  );
}

let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvasCtx() {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = 1;
    sharedCanvas.height = 1;
    sharedCtx = sharedCanvas.getContext("2d", { willReadFrequently: true });
  }
  return sharedCtx;
}

/** Resolve a single CSS color value to an rgba() string using Canvas API. */
function convertColorToRgba(value: string): string {
  const ctx = getSharedCanvasCtx();
  if (!ctx) return "rgba(0,0,0,1)";
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "rgba(0,0,0,0)"; // fallback
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
}

/** Resolve a CSS property value to sRGB strings html2canvas accepts. */
function toComputedColor(prop: string, value: string): string {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden;contain:strict;";
  try {
    probe.style.setProperty(prop, value);
  } catch {
    return "rgba(0,0,0,1)";
  }
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).getPropertyValue(prop);
  probe.remove();
  
  if (resolved && colorNeedsSanitize(resolved)) {
    return convertColorToRgba(resolved);
  }
  return resolved || "rgba(0,0,0,1)";
}

function sanitizeCSSValue(prop: string, value: string): string {
  if (!value || !colorNeedsSanitize(value)) return value;
  const p = prop.toLowerCase();
  if (p === "box-shadow" || p === "text-shadow") return "none";
  if (p === "background" && (/gradient|url/i.test(value) || colorNeedsSanitize(value))) {
    return "";
  }
  if (
    p.includes("color") ||
    p === "fill" ||
    p === "stroke" ||
    p.includes("background") ||
    p.includes("border") ||
    p.includes("outline") ||
    p === "caret-color" ||
    p.includes("shadow") ||
    p.includes("decoration")
  ) {
    if (p === "background-image") return "none";
    return toComputedColor(prop, value);
  }
  return ""; // Fallback: strip the property to prevent html2canvas oklab crashes
}

function copyComputedStyleInline(original: Element, clone: Element) {
  if (!("style" in clone) || clone.style == null) return;
  const target = clone as HTMLElement | SVGElement;
  const cs = window.getComputedStyle(original);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    if (prop.startsWith("--")) continue; // skip custom properties to avoid oklab/oklch parser crashes in html2canvas
    
    let val = cs.getPropertyValue(prop);
    const pri = cs.getPropertyPriority(prop);
    val = sanitizeCSSValue(prop, val);
    try {
      target.style.setProperty(prop, val, pri);
    } catch {
      /* unsupported on element */
    }
  }
}

function walkInlineStyles(original: Element, clone: Element) {
  copyComputedStyleInline(original, clone);
  clone.removeAttribute("class");
  const oCh = [...original.children];
  const cCh = [...clone.children];
  const n = Math.min(oCh.length, cCh.length);
  for (let i = 0; i < n; i++) {
    walkInlineStyles(oCh[i], cCh[i]);
  }
}

export function stripUnsupportedColorsFromClone(
  clonedDoc: Document,
  clonedRoot: HTMLElement,
  originalRoot: HTMLElement
): void {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  clonedDoc.querySelectorAll("style").forEach((n) => n.remove());

  const reset = clonedDoc.createElement("style");
  reset.textContent = `
    *,*::before,*::after{box-sizing:border-box}
    svg{overflow:visible}
  `;
  clonedDoc.head?.prepend(reset);

  // Clean all ancestors (including body and html) of potentially crashing oklab styles
  // Theme providers often set `--var: oklab(...)` on <html> which html2canvas parses and crashes on.
  let curr: HTMLElement | null = clonedRoot.parentElement;
  while (curr) {
    if (curr.style) {
      const propsToRemove: string[] = [];
      for (let i = 0; i < curr.style.length; i++) {
        const prop = curr.style.item(i);
        const val = curr.style.getPropertyValue(prop);
        if (prop.startsWith("--") || colorNeedsSanitize(val)) {
          propsToRemove.push(prop);
        }
      }
      for (const prop of propsToRemove) {
        curr.style.removeProperty(prop);
      }
    }
    curr = curr.parentElement;
  }

  walkInlineStyles(originalRoot, clonedRoot);
}
