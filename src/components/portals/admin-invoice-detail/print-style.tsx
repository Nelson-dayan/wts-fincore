"use client";

export function InvoicePrintStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `@media print {
          body * { visibility: hidden; }
          #invoice-print-root, #invoice-print-root * { visibility: visible; }
          #invoice-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }`,
      }}
    />
  );
}
