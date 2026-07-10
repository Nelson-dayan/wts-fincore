"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import { cn } from "@/lib/utils/cn";
import type { QuotationPayload } from "./types";
import { usePortalConfig } from "@/components/portals/portal-config-context";

const STATUS_OPTIONS: { value: QuotationPayload["status"]; label: string }[] = [
  { value: "draft", label: "draft" },
  { value: "sent", label: "sent" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
];

type StatusEditorProps = {
  quotationId: string;
  currentStatus: QuotationPayload["status"];
  onUpdated: () => void | Promise<void>;
  /** `banner` = prominent strip under header; `inline` = compact row for tables. */
  variant?: "card" | "banner" | "inline";
};

export function QuotationStatusEditor({
  quotationId,
  currentStatus,
  onUpdated,
  variant = "card",
}: StatusEditorProps) {
  const { apiPrefix } = usePortalConfig();
  const [value, setValue] = useState<QuotationPayload["status"]>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setValue(currentStatus);
  }, [currentStatus]);

  async function apply() {
    if (value === currentStatus) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiPrefix}/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const json = await readResponseJson<{ success?: boolean; error?: { message?: string } }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Could not update status");
      setMsg("Status updated.");
      await onUpdated();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        (variant === "banner" || variant === "inline") && "sm:items-center",
        variant === "inline" && "flex-row flex-nowrap items-center gap-2 sm:flex-nowrap"
      )}
    >
      <div
        className={cn(
          "grid min-w-44 gap-2",
          variant === "inline" && "min-w-0 flex-1 sm:min-w-38"
        )}
      >
        {variant !== "inline" ? (
          <Label htmlFor={`quotation-workflow-status-${quotationId}`} className="text-xs font-medium">
            Workflow status
          </Label>
        ) : null}
        <Select
          id={`quotation-workflow-status-${quotationId}`}
          value={value}
          onChange={(e) => setValue(e.target.value as QuotationPayload["status"])}
          options={STATUS_OPTIONS}
          className={cn(
            variant === "banner" && "h-10 bg-background",
            variant === "inline" && "h-9 text-sm"
          )}
          aria-label="Quotation status"
        />
      </div>
      <Button
        type="button"
        size={variant === "inline" ? "sm" : "default"}
        disabled={saving || value === currentStatus}
        onClick={() => void apply()}
        className={cn(
          "w-full sm:w-auto",
          variant === "banner" && "h-10 rounded-xl",
          variant === "inline" && "w-auto shrink-0"
        )}
      >
        {saving ? "…" : "Update"}
      </Button>
      {msg && variant !== "inline" ? (
        <p
          className={
            msg === "Status updated."
              ? "text-sm text-emerald-700 dark:text-emerald-400"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="min-w-56 max-w-72" onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className="mb-4 rounded-2xl border border-primary/25 bg-linear-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm dark:from-primary/10 dark:via-card dark:to-card sm:p-5"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          Quotation workflow
        </p>
        {inner}
      </div>
    );
  }

  return (
    <Card className="mb-4 border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quotation status</CardTitle>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}

/** @deprecated Use QuotationStatusEditor — kept for any stray imports */
export function QuotationStatusCard(props: Omit<StatusEditorProps, "variant">) {
  return <QuotationStatusEditor {...props} variant="card" />;
}
