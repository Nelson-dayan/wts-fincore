"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readResponseJson } from "@/lib/http/read-response-json";

export function NewInvoiceClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const poId = sp?.get("poId") ?? "";
  const invoiceType = sp?.get("invoiceType") === "usd" ? "usd" : "aed";
  const [error, setError] = useState("");
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!poId || hasStartedRef.current) return;
    hasStartedRef.current = true;
    setError("");
    void (async () => {
      try {
        const res = await fetch("/api/admin/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poId, invoiceType }),
        });
        const data = await readResponseJson<{ id?: string; message?: string }>(res);
        if (!res.ok) throw new Error(data.message ?? "Could not create invoice");
        if (!data.id) throw new Error("Missing invoice id");
        router.replace(`/admin/invoices/${data.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, [invoiceType, poId, router]);

  if (!poId) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Purchase order is required. Open invoice from a PO and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Opening invoice editor…</p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
