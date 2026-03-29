"use client";

/**
 * Read an image file as a data URL that PDFKit can embed (JPEG / PNG / GIF).
 * Other types (WebP, SVG, etc.) are rasterized to PNG in the browser.
 */
export async function readFileAsPdfSafeDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const head = raw.slice(0, 64).toLowerCase();
  if (!head.startsWith("data:image/")) {
    return raw;
  }
  const semi = raw.indexOf(";");
  const mime = semi === -1 ? "" : raw.slice(5, semi).toLowerCase();
  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    mime === "image/gif"
  ) {
    return raw;
  }
  try {
    return await rasterizeImageDataUrlToPng(raw);
  } catch {
    /* Still return original so <img> previews work; PDF may skip unsupported types. */
    return raw;
  }
}

async function rasterizeImageDataUrlToPng(dataUrl: string): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load image for PDF. Try PNG or JPEG."));
    img.src = dataUrl;
  });

  const maxW = 2048;
  const maxH = 2048;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w <= 0 || h <= 0) {
    throw new Error("Invalid image dimensions");
  }
  const scale = Math.min(1, maxW / w, maxH / h);
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image for PDF");
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
