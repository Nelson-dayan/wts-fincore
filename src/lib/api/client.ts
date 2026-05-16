import { ApiResponse } from "@/lib/types/api.types";

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  
  if (!response.ok && response.headers.get("content-type")?.includes("application/json") === false) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const json = await response.json();

  // If the response follows the { success: boolean, data: T, error: ... } pattern
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new Error(json.error?.message || json.message || "Request failed");
    }
    return json.data as T;
  }

  // Otherwise, if it's a successful raw response, return it as T
  if (response.ok) {
    return json as T;
  }

  throw new Error(json.message || json.error?.message || "Request failed");
}
