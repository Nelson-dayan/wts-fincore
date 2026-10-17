/** Max raw binary size before base64 (~Mongo 16MB doc budget). */
export const MAX_PO_FILE_BYTES = 9 * 1024 * 1024;

/** Max stored data URL length (base64 expands payload). */
export const MAX_PO_DATA_URL_LENGTH = 14 * 1024 * 1024;

const MIME_MAP: Record<string, string> = {
  "application/pdf": "application/pdf",
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/webp": "image/webp",
};

export function normalizePoUploadMime(contentType: string, filename: string): string | null {
  const t = (contentType ?? "").toLowerCase().split(";")[0].trim();
  if (MIME_MAP[t]) return MIME_MAP[t];

  const name = (filename ?? "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return null;
}

export function isAllowedPoDataUrl(value: string): boolean {
  return /^data:(application\/pdf|image\/png|image\/jpe?g|image\/pjpeg|image\/webp);base64,/i.test(
    value
  );
}

export function containsMaliciousMarkup(buf: Buffer): boolean {
  const header = buf.subarray(0, Math.min(buf.length, 4096)).toString("latin1").toLowerCase();
  return (
    header.includes("<svg") ||
    header.includes("<?xml") ||
    header.includes("<html") ||
    header.includes("<script") ||
    header.includes("<!doctype html") ||
    header.includes("xmlns=") ||
    header.includes("alert(")
  );
}

export function verifyBufferMagicBytes(buf: Buffer, expectedMime: string): boolean {
  if (!buf || buf.length < 4) return false;
  if (containsMaliciousMarkup(buf)) return false;

  if (expectedMime === "application/pdf") {
    return (
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46
    );
  }

  if (expectedMime === "image/png") {
    if (buf.length < 8) return false;
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }

  if (expectedMime === "image/jpeg") {
    return (
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff
    );
  }

  if (expectedMime === "image/webp") {
    if (buf.length < 12) return false;
    const isRiff =
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
    const isWebp =
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

/**
 * Next.js / undici may return a `Blob` instead of a `File` from `FormData` — `instanceof File` can fail.
 * This path handles both.
 */
export async function blobToPoDataUrl(
  blob: Blob,
  filenameHint: string
): Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }> {
  if (!(blob instanceof Blob) || blob.size === 0) {
    return { ok: false, message: "File required" };
  }
  if (blob.size > MAX_PO_FILE_BYTES) {
    return { ok: false, message: "Uploaded file is too large" };
  }
  const mime = normalizePoUploadMime(blob.type, filenameHint);
  if (!mime) {
    return { ok: false, message: "File must be PDF, PNG, JPEG, or WebP" };
  }
  const buf = Buffer.from(await blob.arrayBuffer());

  // Magic byte validation (Finding #05)
  if (!verifyBufferMagicBytes(buf, mime)) {
    return {
      ok: false,
      message: "File signature does not match declared type or contains prohibited markup",
    };
  }

  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  if (dataUrl.length > MAX_PO_DATA_URL_LENGTH) {
    return { ok: false, message: "Uploaded file is too large" };
  }
  return { ok: true, dataUrl };
}

export async function fileToPoDataUrl(
  file: File
): Promise<{ ok: true; dataUrl: string } | { ok: false; message: string }> {
  const name = file?.name?.trim() || "upload.pdf";
  return blobToPoDataUrl(file, name);
}

/** `form.get("file")` — string / null safe; Blob + File dono. */
export function formFileEntryToBlob(
  entry: FormDataEntryValue | null
): { blob: Blob; filename: string } | null {
  if (entry == null || typeof entry === "string") return null;
  if (!(entry instanceof Blob)) return null;
  const filename =
    typeof File !== "undefined" && entry instanceof File && entry.name?.trim()
      ? entry.name.trim()
      : "upload.pdf";
  return { blob: entry, filename };
}

export function validatePoDataUrlString(
  fileDataUrl: string
): { ok: true; dataUrl: string } | { ok: false; message: string } {
  const trimmed = fileDataUrl.trim();
  if (!trimmed) {
    return { ok: false, message: "File data required" };
  }
  if (trimmed.length > MAX_PO_DATA_URL_LENGTH) {
    return { ok: false, message: "Uploaded file is too large" };
  }
  if (!isAllowedPoDataUrl(trimmed)) {
    return {
      ok: false,
      message: "File must be PDF, PNG, JPEG, or WebP (base64 data URL)",
    };
  }

  // Extract declared MIME type and verify binary magic bytes
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    return { ok: false, message: "Invalid base64 data URL format" };
  }
  const declaredMime = match[1]?.toLowerCase() || "";
  const base64Content = match[2] || "";
  const headerBuf = Buffer.from(base64Content.slice(0, 1024), "base64");

  if (!verifyBufferMagicBytes(headerBuf, declaredMime)) {
    return {
      ok: false,
      message: "File signature does not match declared type or contains prohibited markup",
    };
  }

  return { ok: true, dataUrl: trimmed };
}
