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
  taxLabelPreview: string;
  liveTotals: { subtotal: number; tax: number; total: number };
  saving: boolean;
  pdfExporting: boolean;
  msg: string;
  onItemChange: (next: Item) => void;
  onPatchExtra: (key: string, value: any) => void;
  onPatchBank: (which: "bankAed" | "bankUsd", field: keyof Bank, value: string) => void;
  onPatchLine: (idx: number, partial: Partial<Item["pages"][0]["items"][0]>) => void;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onCopyBillToShip: () => void;
  onSave: () => void;
  onDownloadPdf: () => void;
  onOpenLedger: () => void;
};

export function EditorPanel(props: EditorPanelProps) {
  const { item, extras, bankAed, bankUsd, taxLabelPreview, liveTotals, saving, pdfExporting, msg, onItemChange, onPatchExtra, onPatchBank, onPatchLine, onAddLine, onRemoveLine, onCopyBillToShip, onSave, onDownloadPdf, onOpenLedger } = props;

  return (
    <div className="print:hidden space-y-4">
      <div className="py-2 flex top-14 z-50 sticky bg-secondary flex-wrap justify-center gap-2 rounded-md">
          {/* <Link href="/admin/invoices"><Button size="sm" variant="outline">All invoices</Button></Link> */}
        {item.poId ? <Link href={`/admin/purchase-orders/${item.poId}`}><Button size="sm" variant="outline">Open PO</Button></Link> : null}
        <Link href={`/admin/projects/${item.projectId}`}><Button size="sm" variant="outline">Open project</Button></Link>
        <Button
          size="sm"
          variant="default"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
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
      <CompanyCard item={item} onItemChange={onItemChange} onPatchExtra={onPatchExtra} />
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
      <AccountsFooterCard
        bankAed={bankAed}
        bankUsd={bankUsd}
        extras={extras}
        onPatchBank={onPatchBank}
        onPatchExtra={onPatchExtra}
      />
      <div className="h-10" />
    </div>
  );
}
