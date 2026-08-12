"use client";

import { useEffect } from "react";

export function CompanyContextInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let urlString = "";
      if (typeof input === "string") {
        urlString = input;
      } else if (input instanceof URL) {
        urlString = input.toString();
      } else if (input && typeof input === "object" && "url" in input) {
        urlString = (input as Request).url;
      }

      // Check if it's an API route under /api/admin
      if (urlString.includes("/api/admin")) {
        const activeCompanyId = localStorage.getItem("activeCompanyId");
        const scopeMode = localStorage.getItem("scopeMode") || "single";

        if (activeCompanyId) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));

          if (!headers.has("x-company-id")) {
            headers.set("x-company-id", activeCompanyId);
          }
          if (!headers.has("x-scope-mode")) {
            headers.set("x-scope-mode", scopeMode);
          }

          init = {
            ...init,
            headers,
          };
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
