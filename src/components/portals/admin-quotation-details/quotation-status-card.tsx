"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import type { QuotationPayload } from "./types";

const STATUS_OPTIONS: { value: QuotationPayload["status"]; label: string }[] = [
  { value: "draft", label: "draft" },
  { value: "sent", label: "sent" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
];

export function QuotationStatusCard({
  quotationId,
  currentStatus,
  onUpdated,
}: {
  quotationId: string;
  currentStatus: QuotationPayload["status"];
  onUpdated: () => void | Promise<void>;
}) {
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
      const res = await fetch(`/api/admin/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const data = await readResponseJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(data.message ?? "Could not update status");
      setMsg("Status updated.");
      await onUpdated();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quotation status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid min-w-44 gap-2">
          <Label htmlFor="quotation-workflow-status">Status</Label>
          <Select
            id="quotation-workflow-status"
            value={value}
            onChange={(e) =>
              setValue(e.target.value as QuotationPayload["status"])
            }
            options={STATUS_OPTIONS}
          />
        </div>
        <Button
          type="button"
          disabled={saving || value === currentStatus}
          onClick={() => void apply()}
          className="w-full sm:w-auto"
        >
          {saving ? "Saving…" : "Update status"}
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
      </CardContent>
    </Card>
  );
}
