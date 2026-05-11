import { ApiResponse } from "@/lib/types/api.types";

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  
  if (!response.ok && response.headers.get("content-type")?.includes("application/json") === false) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error?.message || "Request failed");
  }

  return json.data;
}
