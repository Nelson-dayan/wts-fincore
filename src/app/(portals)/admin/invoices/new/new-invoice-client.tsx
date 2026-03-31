"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NewInvoiceClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const poId = sp?.get("poId") ?? "";
  const started = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [poHint, setPoHint] = useState("");

  useEffect(() => {
    if (!poId || started.current) return;
    started.current = true;
    setBusy(true);
    setError("");
    void (async () => {
      try {
        const poRes = await fetch(`/api/admin/purchase-orders/${encodeURIComponent(poId)}`, {
          cache: "no-store",
        });
        const poJson = (await poRes.json()) as {
          item?: { poNumber?: string; quotationNumber?: string };
        };
        if (poRes.ok && poJson.item?.poNumber) {
          const qn = poJson.item.quotationNumber?.trim();
          setPoHint(
            qn
              ? `PO ${poJson.item.poNumber} · quotation ${qn} — this invoice is created from that link.`
              : `PO ${poJson.item.poNumber} — quotation data will be copied into the invoice.`
          );
        }

        const res = await fetch("/api/admin/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poId }),
        });
        const data = (await res.json()) as { id?: string; message?: string };
        if (!res.ok) {
          started.current = false;
          setError(data.message ?? "Could not create invoice");
          setBusy(false);
          return;
        }
        if (data.id) router.replace(`/admin/invoices/${data.id}`);
        else {
          setError("Missing invoice id");
          started.current = false;
        }
      } catch {
        started.current = false;
        setError("Network error");
      } finally {
        setBusy(false);
      }
    })();
  }, [poId, router]);

  if (!poId) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          A purchase order is required — add <code className="text-foreground">?poId=...</code> to the URL, or
          use{" "}
          <strong className="text-foreground">New invoice</strong>
          {" "}on the PO detail page.
        </p>
        <Link href="/admin/purchase-orders">
          <Button size="sm" variant="outline">
            Purchase orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {busy ? (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">Creating invoice…</p>
          {poHint ? <p className="text-foreground/90">{poHint}</p> : null}
        </div>
      ) : error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
