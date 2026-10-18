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

export const MAX_REMOTE_URL_LENGTH = 2048;

export function isBlockedHostnameForSsrf(hostname: string): boolean {
  const h = (hostname ?? "").trim().toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h === "local") return true;
  if (h === "0.0.0.0" || h === "127.0.0.1") return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const a = +ipv4[1];
    const b = +ipv4[2];
    const c = +ipv4[3];
    const d = +ipv4[4];
    if ([a, b, c, d].some((x) => x > 255)) return true;
    if (a === 0 || a === 127) return true;
    if (a === 10) return true;
    if (a === 169 && b === 254) return true; // Link-local / AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (h.includes(":")) {
    if (h === "::1" || h === "::") return true;
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
    const tail = h.includes("::ffff:") ? h.split("::ffff:")[1] : null;
    if (tail && isBlockedHostnameForSsrf(tail)) return true;
  }
  return false;
}

export function containsMaliciousMarkup(buf: Buffer): boolean {
  if (!buf || buf.length === 0) return false;
  // Inspect the first 64KB for malicious tags, event handlers, and script payloads
  const scanLimit = Math.min(buf.length, 65536);
  const sample = buf.subarray(0, scanLimit).toString("latin1").toLowerCase();
  return (
    sample.includes("<svg") ||
    sample.includes("<?xml") ||
    sample.includes("<html") ||
    sample.includes("<script") ||
    sample.includes("<!doctype html") ||
    sample.includes("xmlns=") ||
    sample.includes("alert(") ||
    sample.includes("onerror=") ||
    sample.includes("onload=") ||
    sample.includes("<iframe") ||
    sample.includes("<object") ||
    sample.includes("<embed") ||
    sample.includes("<math")
  );
}

export function verifyBufferMagicBytes(buf: Buffer, expectedMime: string): boolean {
  if (!buf || buf.length < 4) return false;
  if (containsMaliciousMarkup(buf)) return false;

  const normalized = expectedMime.toLowerCase();

  if (normalized === "application/pdf") {
    return (
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 // %PDF
    );
  }

  if (normalized === "image/png") {
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

  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return (
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff
    );
  }

  if (normalized === "image/webp") {
    if (buf.length < 12) return false;
    const isRiff =
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46; // RIFF
    const isWebp =
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50; // WEBP
    return isRiff && isWebp;
  }

  return false;
}

/**
 * Universal validator for PO file inputs (data URLs or remote URLs).
 * Validates binary signatures, MIME types, base64 integrity, SSRF safety, and size limits.
 */
export function validatePoFileUrl(
  inputUrl: string
): { ok: true; url: string } | { ok: false; message: string } {
  const trimmed = String(inputUrl ?? "").trim();
  if (!trimmed) {
    return { ok: false, message: "File data required" };
  }

  // 1. Data URL Path
  if (trimmed.startsWith("data:")) {
    if (trimmed.length > MAX_PO_DATA_URL_LENGTH) {
      return { ok: false, message: "Uploaded file is too large" };
    }

    const match = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
    if (!match) {
      return {
        ok: false,
        message: "File must be PDF, PNG, JPEG, or WebP (base64 data URL)",
      };
    }

    const rawMime = match[1]?.toLowerCase().trim() || "";
    const declaredMime = MIME_MAP[rawMime];
    if (!declaredMime) {
      return {
        ok: false,
        message: "File must be PDF, PNG, JPEG, or WebP (unsupported MIME type)",
      };
    }

    const base64Content = match[2]?.replace(/\s+/g, "") || "";
    // Verify valid base64 character set
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Content)) {
      return { ok: false, message: "Malformed base64 file data" };
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(base64Content, "base64");
    } catch {
      return { ok: false, message: "Malformed base64 file data" };
    }

    if (buf.length === 0) {
      return { ok: false, message: "Uploaded file is empty" };
    }

    if (buf.length > MAX_PO_FILE_BYTES) {
      return { ok: false, message: "Uploaded file is too large" };
    }

    if (!verifyBufferMagicBytes(buf, declaredMime)) {
      return {
        ok: false,
        message: "File signature does not match declared type or contains prohibited markup",
      };
    }

    return { ok: true, url: trimmed };
  }

  // 2. Remote URL Path
  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.length > MAX_REMOTE_URL_LENGTH) {
      return { ok: false, message: "Remote file URL exceeds maximum allowed length" };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, message: "Invalid remote file URL" };
    }

    if (parsed.protocol !== "https:") {
      return { ok: false, message: "Only HTTPS remote URLs are supported" };
    }

    if (isBlockedHostnameForSsrf(parsed.hostname)) {
      return { ok: false, message: "Remote URL host is prohibited (SSRF protection)" };
    }

    const pathname = parsed.pathname.toLowerCase();
    const allowedExts = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const hasValidExt = allowedExts.some((ext) => pathname.endsWith(ext));
    if (!hasValidExt) {
      return {
        ok: false,
        message: "Remote file must be a PDF, PNG, JPEG, or WebP document",
      };
    }

    return { ok: true, url: parsed.toString() };
  }

  return {
    ok: false,
    message: "Invalid file URL or format. Must be a valid PDF, PNG, JPEG, or WebP document.",
  };
}

/**
 * Backward-compatible alias for data URL validation.
 */
export function validatePoDataUrlString(
  fileDataUrl: string
): { ok: true; dataUrl: string } | { ok: false; message: string } {
  const result = validatePoFileUrl(fileDataUrl);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, dataUrl: result.url };
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
