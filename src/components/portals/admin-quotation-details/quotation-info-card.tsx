"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuotationInfoCardProps = {
  editing: boolean;
  leadTime: string;
  validity: string;
  terms: string;
  remainingAmount: string;
  confirmDate: string;
  remainingText: string;
  onLeadTimeChange: (value: string) => void;
  onValidityChange: (value: string) => void;
  onTermsChange: (value: string) => void;
  onRemainingAmountChange: (value: string) => void;
  onConfirmDateChange: (value: string) => void;
  onRemainingTextChange: (value: string) => void;
};

export function QuotationInfoCard({
  editing,
  leadTime,
  validity,
  terms,
  remainingAmount,
  confirmDate,
  remainingText,
  onLeadTimeChange,
  onValidityChange,
  onTermsChange,
  onRemainingAmountChange,
  onConfirmDateChange,
  onRemainingTextChange,
}: QuotationInfoCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Quotation info</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label>Lead time</Label>
              <Input value={leadTime} onChange={(e) => onLeadTimeChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Validity</Label>
              <Input value={validity} onChange={(e) => onValidityChange(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Terms</Label>
              <Input value={terms} onChange={(e) => onTermsChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Remaining amount</Label>
              <Input type="number" value={remainingAmount} onChange={(e) => onRemainingAmountChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Confirm date</Label>
              <Input type="date" value={confirmDate} onChange={(e) => onConfirmDateChange(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Remaining text</Label>
              <Input value={remainingText} onChange={(e) => onRemainingTextChange(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <p>
              <strong>Lead time:</strong> {leadTime || "-"}
            </p>
            <p>
              <strong>Validity:</strong> {validity || "-"}
            </p>
            <p className="sm:col-span-2">
              <strong>Terms:</strong> {terms || "-"}
            </p>
            <p>
              <strong>Remaining amount:</strong> {remainingAmount || "-"}
            </p>
            <p>
              <strong>Confirm date:</strong> {confirmDate ? new Date(confirmDate).toLocaleDateString() : "-"}
            </p>
            <p className="sm:col-span-2">
              <strong>Remaining text:</strong> {remainingText || "-"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
