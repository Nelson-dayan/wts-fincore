/**
 * Parse a fetch Response body as JSON without throwing on an empty body.
 * `response.json()` throws SyntaxError when the body is empty or whitespace-only.
 */
export async function readResponseJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return {} as T;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new SyntaxError(
      `Server returned invalid JSON (HTTP ${response.status})`
    );
  }
}
