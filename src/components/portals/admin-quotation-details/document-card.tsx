"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import type { QuotationPayload } from "./types";

type DocumentCardProps = {
  editing: boolean;
  status: QuotationPayload["status"];
  docDate: string;
  quotationCode: string;
  subject: string;
  title: string;
  description: string;
  taxRate: string;
  taxEnabled: boolean;
  currency: string;
  onStatusChange: (value: QuotationPayload["status"]) => void;
  onDocDateChange: (value: string) => void;
  onQuotationCodeChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTaxRateChange: (value: string) => void;
  onTaxEnabledChange: (value: boolean) => void;
  onCurrencyChange: (value: string) => void;
};

export function DocumentCard(props: DocumentCardProps) {
  const {
    editing,
    status,
    docDate,
    quotationCode,
    subject,
    title,
    description,
    taxRate,
    taxEnabled,
    currency,
    onStatusChange,
    onDocDateChange,
    onQuotationCodeChange,
    onSubjectChange,
    onTitleChange,
    onDescriptionChange,
    onTaxRateChange,
    onTaxEnabledChange,
    onCurrencyChange,
  } = props;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Document</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(e) => onStatusChange(e.target.value as QuotationPayload["status"])}
                options={[
                  { value: "draft", label: "draft" },
                  { value: "sent", label: "sent" },
                  { value: "approved", label: "approved" },
                  { value: "rejected", label: "rejected" },
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                options={[...SUPPORTED_CURRENCIES]}
              />
            </div>
            <div className="space-y-1">
              <Label>Document date</Label>
              <Input type="date" value={docDate} onChange={(e) => onDocDateChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Quotation code</Label>
              <Input value={quotationCode} onChange={(e) => onQuotationCodeChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => onTitleChange(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => onDescriptionChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tax rate (%)</Label>
              <Input type="number" min={0} value={taxRate} onChange={(e) => onTaxRateChange(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={taxEnabled} onChange={(e) => onTaxEnabledChange(e.target.checked)} />
                Tax enabled
              </label>
            </div>
          </>
        ) : (
          <>
            <p>
              <strong>Date:</strong> {docDate ? new Date(docDate).toLocaleDateString() : "-"}
            </p>
            <p>
              <strong>Quotation code:</strong> {quotationCode || "-"}
            </p>
            <p>
              <strong>Subject:</strong> {subject || "-"}
            </p>
            <p>
              <strong>Title:</strong> {title || "-"}
            </p>
            <p className="sm:col-span-2">
              <strong>Description:</strong> {description || "-"}
            </p>
            <p>
              <strong>Tax:</strong> {taxEnabled ? `${taxRate}%` : "off"}
            </p>
            <p>
              <strong>Currency:</strong> {currency}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
