"use client";

/**
 * Print: A4 portrait, ~12mm margins. Only `#invoice-print-root` stays visible.
 * Uses relative positioning so multi-page invoices print correctly in the browser.
 */
export function InvoicePrintStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@page {
  size: A4 portrait;
  margin: 12mm;
}

@media print {
  html {
    height: auto !important;
  }
  body {
    background: #fff !important;
    color: #000 !important;
    height: auto !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body * {
    visibility: hidden;
  }
  #invoice-print-root,
  #invoice-print-root * {
    visibility: visible;
  }
  #invoice-print-root {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    width: 186mm !important;
    max-width: none !important;
    margin: 0 auto !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: #fff !important;
    break-inside: auto;
    text-rendering: geometricPrecision;
  }
  #invoice-print-root a {
    color: inherit !important;
    text-decoration: none !important;
  }
}
`,
      }}
    />
  );
}
