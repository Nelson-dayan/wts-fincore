import net from "net";

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

/**
 * Converts an alternate IPv4 representation to dotted-decimal, or returns null
 * if the input is not a recognized alternate form.
 * Handles DWORD/decimal integers (2130706433), octal (0177.0.0.1), and hex (0x7f.0.0.1).
 */
function normalizeToDottedDecimalIpv4(h: string): string | null {
  // Pure integer (DWORD): e.g. 2130706433 => 127.0.0.1
  if (/^\d{7,10}$/.test(h)) {
    const n = parseInt(h, 10);
    if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return null;
    return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
  }
  // Pure hex: e.g. 0x7f000001
  if (/^0x[0-9a-f]{1,8}$/i.test(h)) {
    const n = parseInt(h, 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return null;
    return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
  }
  // Octal or hex dotted quads, possibly mixed with plain decimals:
  const parts = h.split(".");
  if (parts.length === 4) {
    let hasAlt = false;
    const nums = parts.map((p) => {
      if (/^0x[0-9a-f]+$/i.test(p)) { hasAlt = true; return parseInt(p, 16); }
      if (/^0[0-7]+$/.test(p)) { hasAlt = true; return parseInt(p, 8); } // octal (e.g. 0177)
      if (/^\d+$/.test(p)) return parseInt(p, 10); // plain decimal part in mixed quad
      return NaN;
    });
    if (hasAlt && nums.every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) {
      return nums.join(".");
    }
  }
  return null;
}

/**
 * Validates whether an IP address belongs to loopback, private, link-local,
 * cloud metadata, CGNAT, multicast, benchmark, or reserved ranges.
 * Handles both IPv4 and IPv6, including IPv4-mapped IPv6.
 * Fails closed (returns true) for invalid or malformed IP addresses.
 */
export function isBlockedIpAddress(ip: string): boolean {
  const clean = String(ip ?? "").trim().toLowerCase();
  if (!clean) return true;

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (clean.includes("::ffff:")) {
    const tail = clean.split("::ffff:")[1];
    if (tail) {
      if (net.isIP(tail) === 4) {
        return isBlockedIpAddress(tail);
      }
      const hexMatch = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
      if (hexMatch) {
        const high = parseInt(hexMatch[1], 16);
        const low = parseInt(hexMatch[2], 16);
        if (Number.isFinite(high) && Number.isFinite(low)) {
          const dotted = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
          return isBlockedIpAddress(dotted);
        }
      }
    }
    return true; // Malformed mapped address -> fail closed
  }

  const version = net.isIP(clean);
  if (version === 4) {
    const parts = clean.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4 -> fail closed
    }
    const [a, b, c] = parts;
    if (a === 0 || a === 127) return true; // 0.0.0.0/8 & 127.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & AWS metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24 & 192.0.2.0/24
    if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
    if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a >= 224) return true; // 224.0.0.0/4 (multicast) & 240.0.0.0/4 (reserved) & 255.255.255.255
    return false;
  }

  if (version === 6) {
    if (clean === "::1" || clean === "::") return true;
    if (/^fe[89ab][0-9a-f]/i.test(clean) || clean.startsWith("fe80:")) return true;
    if (clean.startsWith("fc") || clean.startsWith("fd")) return true;
    if (clean.startsWith("ff")) return true;
    if (clean.startsWith("2001:db8:") || clean.startsWith("2001:0db8:")) return true;
    if (clean.startsWith("100::") || clean.startsWith("0100::")) return true;
    if (clean.startsWith("2001:10:") || clean.startsWith("2001:20:")) return true;
    return false;
  }

  return true;
}

export function isBlockedHostnameForSsrf(hostname: string): boolean {
  const h = (hostname ?? "").trim().toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h === "local") return true;
  if (h === "0.0.0.0" || h === "127.0.0.1") return true;

  // Normalize alternate IPv4 representations (DWORD, hex, octal) before checking
  const normalized = normalizeToDottedDecimalIpv4(h);
  if (normalized !== null) {
    return isBlockedIpAddress(normalized);
  }

  // If hostname is directly an IP address, validate it
  if (net.isIP(h)) {
    return isBlockedIpAddress(h);
  }

  // Handle dotless local hostnames without TLD
  if (!h.includes(".")) {
    return true;
  }

  return false;
}

/** Returns true if a parsed URL contains embedded credentials (user:pass@host). */
export function hasEmbeddedCredentials(parsed: URL): boolean {
  return Boolean(parsed.username || parsed.password);
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

  if (normalized === "image/jpeg" || normalized === "image/jpg" || normalized === "image/pjpeg") {
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
 * Validates file buffer magic bytes (Finding #05).
 */
export function validateFileMagicBytes(
  buf: Buffer,
  declaredMime: string
): { valid: boolean; error?: string } {
  if (!buf || buf.length < 4) {
    return { valid: false, error: "File buffer is too small or empty" };
  }
  if (containsMaliciousMarkup(buf)) {
    return { valid: false, error: "SVG or HTML file upload is forbidden (XSS prevention)" };
  }
  const valid = verifyBufferMagicBytes(buf, declaredMime);
  if (!valid) {
    return { valid: false, error: "File signature does not match declared type or contains prohibited markup" };
  }
  return { valid: true };
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

    // Reject URLs embedding credentials (user:pass@host)
    if (hasEmbeddedCredentials(parsed)) {
      return { ok: false, message: "Remote URL must not contain embedded credentials" };
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

    return { ok: true, url: parsed.href };
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
 * Next.js / undici may return a `Blob` instead of a `File` from `FormData`.
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

/** `form.get("file")` — string / null safe; Blob + File handling. */
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
