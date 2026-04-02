"use client";

import Link from "next/link";
import { AccountsFooterCard } from "@/components/portals/admin-invoice-detail/accounts-footer-card";
import { BillShipCard } from "@/components/portals/admin-invoice-detail/bill-ship-card";
import { CompanyCard } from "@/components/portals/admin-invoice-detail/company-card";
import { HeadingCard } from "@/components/portals/admin-invoice-detail/heading-card";
import { LineItemsCard } from "@/components/portals/admin-invoice-detail/line-items-card";
import { Button } from "@/components/ui/button";
import type { Bank, Item } from "./types";

type EditorPanelProps = {
  item: Item;
  extras: Record<string, unknown>;
  bankAed: Bank;
  bankUsd: Bank;
  logoErr: string;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  taxLabelPreview: string;
  liveTotals: { subtotal: number; tax: number; total: number };
  saving: boolean;
  pdfExporting: boolean;
  msg: string;
  onItemChange: (next: Item) => void;
  onPatchExtra: (key: string, value: string) => void;
  onPatchBank: (which: "bankAed" | "bankUsd", field: keyof Bank, value: string) => void;
  onPatchLine: (idx: number, partial: Partial<Item["pages"][0]["items"][0]>) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onCopyBillToShip: () => void;
  onPickLogo: (files: FileList | null) => Promise<void>;
  onSave: () => void;
  onDownloadPdf: () => void;
};

export function EditorPanel(props: EditorPanelProps) {
  const { item, extras, bankAed, bankUsd, logoErr, logoInputRef, taxLabelPreview, liveTotals, saving, pdfExporting, msg, onItemChange, onPatchExtra, onPatchBank, onPatchLine, onAddLine, onRemoveLine, onCopyBillToShip, onPickLogo, onSave, onDownloadPdf } = props;

  return (
    <div className="print:hidden space-y-4">
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/invoices"><Button size="sm" variant="outline">All invoices</Button></Link>
        {item.poId ? <Link href={`/admin/purchase-orders/${item.poId}`}><Button size="sm" variant="outline">Open PO</Button></Link> : null}
        <Link href={`/admin/projects/${item.projectId}`}><Button size="sm" variant="outline">Open project</Button></Link>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          Print (A4)
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={pdfExporting}
          onClick={() => onDownloadPdf()}
        >
          {pdfExporting ? "PDF…" : "Download PDF"}
        </Button>
      </div>
      <HeadingCard item={item} extras={extras} onItemChange={onItemChange} onPatchExtra={onPatchExtra} />
      <CompanyCard item={item} logoErr={logoErr} logoInputRef={logoInputRef} onItemChange={onItemChange} onPatchExtra={onPatchExtra} onPickLogo={onPickLogo} />
      <BillShipCard item={item} extras={extras} onItemChange={onItemChange} onPatchExtra={onPatchExtra} onCopyBillToShip={onCopyBillToShip} />
      <LineItemsCard
        item={item}
        extras={extras}
        taxLabelPreview={taxLabelPreview}
        liveTotals={liveTotals}
        onPatchLine={onPatchLine}
        onAddLine={onAddLine}
        onRemoveLine={onRemoveLine}
        onPatchExtra={onPatchExtra}
      />
      <AccountsFooterCard bankAed={bankAed} bankUsd={bankUsd} onPatchBank={onPatchBank} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        {msg ? <p className={msg === "Saved." ? "text-primary text-sm" : "text-destructive text-sm"} role="status">{msg}</p> : null}
      </div>
    </div>
  );
}
