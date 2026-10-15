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

export function validateFileMagicBytes(
  buf: Buffer,
  declaredMime: string
): { valid: boolean; error?: string } {
  if (!buf || buf.length < 4) {
    return { valid: false, error: "File buffer is too small or empty" };
  }

  // Check for malicious SVG / XML / HTML content anywhere in the first 2KB
  const headText = buf.subarray(0, Math.min(buf.length, 2048)).toString("utf-8").toLowerCase();
  if (
    headText.includes("<svg") ||
    headText.includes("<?xml") ||
    headText.includes("<!doctype html") ||
    headText.includes("<html") ||
    headText.includes("<script") ||
    headText.includes("xmlns=\"http://www.w3.org/2000/svg\"") ||
    headText.includes("xmlns='http://www.w3.org/2000/svg'")
  ) {
    return { valid: false, error: "SVG or HTML file upload is forbidden (XSS prevention)" };
  }

  const mime = declaredMime.toLowerCase().trim();

  // Validate PDF signature: %PDF (0x25, 0x50, 0x44, 0x46)
  if (mime === "application/pdf") {
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      return { valid: true };
    }
    return { valid: false, error: "Declared as PDF but does not have valid PDF magic bytes (%PDF)" };
  }

  // Validate PNG signature: 0x89, 0x50, 0x4E, 0x47 (\x89PNG)
  if (mime === "image/png") {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { valid: true };
    }
    return { valid: false, error: "Declared as PNG but does not have valid PNG magic bytes" };
  }

  // Validate JPEG signature: 0xFF, 0xD8, 0xFF
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/pjpeg") {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { valid: true };
    }
    return { valid: false, error: "Declared as JPEG but does not have valid JPEG magic bytes (FF D8 FF)" };
  }

  // Validate WebP signature: RIFF at offset 0, WEBP at offset 8
  if (mime === "image/webp") {
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50   // WEBP
    ) {
      return { valid: true };
    }
    return { valid: false, error: "Declared as WebP but does not have valid WebP magic bytes (RIFF....WEBP)" };
  }

  return { valid: false, error: `Unsupported or unverified file type '${declaredMime}'` };
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
  const magicCheck = validateFileMagicBytes(buf, mime);
  if (!magicCheck.valid) {
    return { ok: false, message: magicCheck.error || "File signature validation failed" };
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

  // Finding #05: Decode base64 and verify file magic bytes to prevent MIME spoofing / SVG XSS injection
  const match = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (!match) {
    return { ok: false, message: "File must be PDF, PNG, JPEG, or WebP (base64 data URL)" };
  }
  const declaredMime = match[1].toLowerCase().trim();
  const normalizedMime = normalizePoUploadMime(declaredMime, "upload");
  if (!normalizedMime) {
    return { ok: false, message: "File must be PDF, PNG, JPEG, or WebP" };
  }

  try {
    const rawBase64 = match[2];
    const buf = Buffer.from(rawBase64, "base64");
    const magicCheck = validateFileMagicBytes(buf, normalizedMime);
    if (!magicCheck.valid) {
      return { ok: false, message: magicCheck.error || "File signature validation failed" };
    }
  } catch {
    return { ok: false, message: "Invalid base64 payload" };
  }

  return { ok: true, dataUrl: trimmed };
}
