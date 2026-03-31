/**
 * html2canvas 1.x cannot parse modern CSS color functions (lab/oklab/lch/oklch, etc.).
 * We strip cloned document stylesheets and inline computed styles in sRGB form.
 */

function colorNeedsSanitize(value: string): boolean {
  if (/\boklab\s*\(|\boklch\s*\(/i.test(value)) return true;
  // Avoid false positives inside words (e.g. "collab(") for bare lab()/lch()
  if (/(?<![a-zA-Z])lab\s*\(/i.test(value)) return true;
  if (/(?<![a-zA-Z])lch\s*\(/i.test(value)) return true;
  if (/\bhwb\s*\(|\bcolor-mix\s*\(/i.test(value)) return true;
  if (/\bcolor\s*\(\s*(?:srgb|display-p3|a98-rgb)/i.test(value)) return true;
  return false;
}

/** Resolve a color value for `prop` to sRGB strings html2canvas accepts. */
function toComputedColor(prop: string, value: string): string {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;visibility:hidden;contain:strict;";
  try {
    probe.style.setProperty(prop, value);
  } catch {
    return "rgba(0,0,0,1)";
  }
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).getPropertyValue(prop);
  probe.remove();
  return resolved && !colorNeedsSanitize(resolved) ? resolved : "rgba(0,0,0,1)";
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
    p === "caret-color"
  ) {
    if (p === "background-image") return "none";
    return toComputedColor(prop, value);
  }
  return value;
}

function copyComputedStyleInline(original: Element, clone: Element) {
  if (!("style" in clone) || clone.style == null) return;
  const target = clone as HTMLElement | SVGElement;
  const cs = window.getComputedStyle(original);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
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

/**
 * Call from html2canvas `onclone` with the live node and its clone (root of capture).
 */
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

  walkInlineStyles(originalRoot, clonedRoot);
}
