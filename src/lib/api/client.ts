import { ApiResponse } from "@/lib/types/api.types";

function generateClientUUID(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Math.random fallback for non-crypto secure contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const updatedInit: RequestInit = {
    cache: "no-store",
    ...init
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const headers = new Headers(updatedInit.headers);
    if (!headers.has("Idempotency-Key")) {
      headers.set("Idempotency-Key", generateClientUUID());
    }
    updatedInit.headers = headers;
  }

  const response = await fetch(input, updatedInit);
  
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
