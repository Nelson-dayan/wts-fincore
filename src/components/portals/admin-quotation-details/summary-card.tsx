"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuotationPayload } from "./types";

type SummaryCardProps = {
  item: QuotationPayload;
  editing: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
};

export function SummaryCard({
  item,
  editing,
  saving,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}: SummaryCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Summary</CardTitle>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={onSave} disabled={saving}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={onStartEdit}>
                Edit
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={saving}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <strong>Project:</strong> {item.projectName ?? item.projectId}
        </p>
        <p>
          <strong>Status:</strong> {item.status}
        </p>
        <p>
          <strong>Subtotal:</strong> {item.totals.subtotal}
        </p>
        <p>
          <strong>Tax:</strong> {item.totals.tax}
        </p>
        <p>
          <strong>Total:</strong> {item.totals.total}
        </p>
      </CardContent>
    </Card>
  );
}
