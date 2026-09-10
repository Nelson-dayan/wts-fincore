"use client";

import { Button } from "@/components/ui/button";

export function PurchaseOrderFilePreview({ fileUrl }: { fileUrl: string }) {
  const u = fileUrl.trim();
  if (!u) {
    return <p className="text-muted-foreground text-sm">No file attached.</p>;
  }
  if (u.startsWith("data:application/pdf")) {
    return (
      <iframe
        title="PO document"
        src={u}
        className="mt-2 h-[min(72vh,820px)] w-full rounded-lg border border-border/60 bg-white"
      />
    );
  }
  if (u.startsWith("data:image/")) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={u}
        alt="Purchase order"
        className="mt-2 max-h-[min(72vh,820px)] w-auto max-w-full rounded-lg border border-border/60 object-contain"
      />
    );
  }
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return (
      <Button variant="outline" size="sm" className="mt-2" asChild>
        <a href={u} target="_blank" rel="noreferrer">
          Open linked document
        </a>
      </Button>
    );
  }
  return (
    <p className="text-muted-foreground mt-2 text-sm break-all">
      Stored attachment (data or URL).
    </p>
  );
}
