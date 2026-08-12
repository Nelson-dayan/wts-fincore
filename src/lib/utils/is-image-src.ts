/**
 * Helper to check if a string value is a valid image URL or Data URL,
 * preventing plain text (e.g. company name "Sec-DocuTrade Dubai") from being
 * passed to `<img src="...">` which causes 404 network requests.
 */
export function isImageSrc(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("blob:")
  );
}
