"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import { cn } from "@/lib/utils/cn";
import type { QuotationPayload } from "./types";
import { usePortalConfig } from "@/components/portals/portal-config-context";

const STATUS_OPTIONS: { value: QuotationPayload["status"]; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
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

  async function apply(overrideVal?: QuotationPayload["status"]) {
    const targetVal = overrideVal ?? value;
    if (targetVal === currentStatus && !overrideVal) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiPrefix}/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetVal }),
      });
      const json = await readResponseJson<{ success?: boolean; error?: { message?: string } }>(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Could not update status");
      setMsg("Status updated.");
      await onUpdated();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not update status");
      setValue(currentStatus);
    } finally {
      setSaving(false);
    }
  }

  if (variant === "inline") {
    const statusColorClass =
      value === "approved"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
        : value === "sent"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30"
        : value === "rejected"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

    return (
      <div className="relative inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Select
          id={`quotation-workflow-status-${quotationId}`}
          value={value}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.value as QuotationPayload["status"];
            setValue(next);
            void apply(next);
          }}
          options={STATUS_OPTIONS}
          className={cn(
            "h-7.5 w-26 text-xs font-bold rounded-lg border shadow-2xs transition-colors cursor-pointer",
            statusColorClass
          )}
          aria-label="Quotation status"
        />
        {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
      </div>
    );
  }

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        variant === "banner" && "sm:items-center"
      )}
    >
      <div className="grid min-w-44 gap-2">
        <Label htmlFor={`quotation-workflow-status-${quotationId}`} className="text-xs font-medium">
          Workflow status
        </Label>
        <Select
          id={`quotation-workflow-status-${quotationId}`}
          value={value}
          onChange={(e) => setValue(e.target.value as QuotationPayload["status"])}
          options={STATUS_OPTIONS}
          className={cn(variant === "banner" && "h-10 bg-background")}
          aria-label="Quotation status"
        />
      </div>
      <Button
        type="button"
        disabled={saving || value === currentStatus}
        onClick={() => void apply()}
        className={cn("w-full sm:w-auto", variant === "banner" && "h-10 rounded-xl")}
      >
        {saving ? "Updating…" : "Update Status"}
      </Button>
      {msg ? (
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

  if (variant === "banner") {
    return (
      <div className="mb-4 rounded-2xl border border-primary/25 bg-linear-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm dark:from-primary/10 dark:via-card dark:to-card sm:p-5">
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
