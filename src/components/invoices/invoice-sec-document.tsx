"use client";

import Link from "next/link";

export type InvoiceDocLine = {
  number: number;
  name: string;
  description: string;
  quantity: number;
  price: number;
};

export type InvoiceDocBank = {
  accountName?: string;
  accountNo?: string;
  iban?: string;
  bankName?: string;
  swift?: string;
};

export type InvoiceDocData = {
  invoiceNumber: string;
  documentInfo: {
    date?: string;
    title?: string;
    taxRate?: number;
    taxEnabled?: boolean;
  };
  clientSnapshot: {
    name?: string;
    company?: string;
    address?: string;
  };
  companySnapshot: {
    name?: string;
    address?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  pages: Array<{ pageNumber: number; items: InvoiceDocLine[] }>;
  totals: { subtotal: number; tax: number; total: number };
  extras: {
    paymentTerms?: string;
    companyTrn?: string;
    clientTrn?: string;
    shipToCompany?: string;
    shipToAddress?: string;
    shipToTrn?: string;
    poNumberRef?: string;
    bankAed?: InvoiceDocBank;
    bankUsd?: InvoiceDocBank;
    footerTerms?: string;
    footerCurrencyLine?: string;
    disclaimer?: string;
    amountInWords?: string;
  };
  dueDate?: string;
  poId?: string;
};

function formatAed(n: number): string {
  const num = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `AED ${num}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BankBlock({
  title,
  b,
}: {
  title: string;
  b: InvoiceDocBank | undefined;
}) {
  if (!b) return null;
  const rows: [string, string][] = [
    ["Name", String(b.accountName ?? "")],
    ["Account No", String(b.accountNo ?? "")],
    ["IBAN", String(b.iban ?? "")],
    ["Bank Name", String(b.bankName ?? "")],
    ["Swift Code", String(b.swift ?? "")],
  ];
  return (
    <div className="mb-3 break-inside-avoid">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-800">{title}</p>
      <table className="w-full border-separate border-spacing-0 border border-[#a9a9a9] text-[10px]">
        <tbody>
          {rows.map(([k, v], idx) => (
            <tr key={k} className={idx < rows.length - 1 ? "border-b border-[#b7b7b7]" : ""}>
              <td className="w-[32%] border-r border-[#b7b7b7] bg-[#f2f2f2] px-1.5 py-1 font-medium text-[#2a2a2a]">
                {k}
              </td>
              <td className="px-1.5 py-1 text-[#111]">{v || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceSecDocument({
  data,
  mode = "screen",
}: {
  data: InvoiceDocData;
  mode?: "screen" | "print";
}) {
  const { documentInfo, clientSnapshot, companySnapshot, extras, totals, pages } = data;
  const companyName = String(companySnapshot.name ?? "").trim();
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizedCompanyName = normalize(companyName);
  const companyAddressRaw = String(companySnapshot.address ?? "");
  const companyAddressLines = companyAddressRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const companyAddress = companyAddressLines
    .filter((line, idx) => {
      if (idx !== 0 || !normalizedCompanyName) return true;
      return !normalize(line).includes(normalizedCompanyName);
    })
    .join("\n")
    .trim();
  const taxRate = documentInfo.taxRate ?? 5;
  const taxLabel = documentInfo.taxEnabled !== false ? `Tax (${taxRate}%)` : "Tax";

  const lines = pages.flatMap((p) => p.items);
  const balanceDue = totals.total ?? 0;

  const shell =
    mode === "print"
      ? "bg-white p-8 text-neutral-900 print:p-0"
      : "bg-white p-8 text-neutral-900 print:border-0 print:p-0 print:shadow-none";

  /** Screen: max A4 width; print: full printable width (margins come from @page). */
  return (
    <div
      className={`box-border mx-auto w-full max-w-[210mm] ${shell}`}
      id="invoice-print-root"
      data-invoice-a4="true"
    >
      <header className="mb-4 flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {companySnapshot.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={companySnapshot.logoUrl}
              alt=""
              className="h-14 w-auto max-w-30 object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[#1e3a5f] text-[10px] font-bold leading-tight text-white">
              SEC
              <br />
              LANCE
            </div>
          )}
          <div className="min-w-0 text-[10px] leading-snug">
            <p className="text-[12px] font-semibold text-neutral-900">{companySnapshot.name || "—"}</p>
            <p className="whitespace-pre-wrap text-neutral-700">{companyAddress || companySnapshot.address || ""}</p>
            {extras.companyTrn ? (
              <p className="mt-1 font-medium text-neutral-800">TRN: {extras.companyTrn}</p>
            ) : null}
          </div>
        </div>
        <div className="text-right sm:min-w-50">
          <p className="text-[38px] font-light leading-none tracking-tight text-[#1e3552]">
            {documentInfo.title || "INVOICE"}
          </p>
          <p className="mt-2 font-mono text-[11px] font-medium text-neutral-500">{data.invoiceNumber}</p>
        </div>
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_1fr_1.3fr]">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-neutral-500">Bill To:</p>
          <p className="mt-0.5 text-[12px] font-bold text-neutral-900">{clientSnapshot.name || "—"}</p>
          <p className="text-[12px] font-bold text-neutral-900">{clientSnapshot.company}</p>
          <p className="whitespace-pre-wrap text-[12px] font-semibold leading-tight text-neutral-900">{clientSnapshot.address}</p>
          {extras.clientTrn ? (
            <p className="mt-1 text-[12px] font-semibold">TRN: {extras.clientTrn}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-neutral-500">Ship To:</p>
          <p className="mt-0.5 text-[12px] font-bold text-neutral-900">
            {extras.shipToCompany || clientSnapshot.company || "—"}
          </p>
          <p className="whitespace-pre-wrap text-[12px] font-semibold leading-tight text-neutral-900">
            {extras.shipToAddress || clientSnapshot.address || ""}
          </p>
          {extras.shipToTrn ? (
            <p className="mt-1 text-[12px] font-semibold">TRN: {extras.shipToTrn}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <table className="ml-auto w-full text-right text-[12px]">
          <tbody>
            <tr>
              <td className="pr-5 font-medium text-neutral-500">Date:</td>
              <td className="font-medium text-neutral-900">{formatDate(documentInfo.date)}</td>
            </tr>
            <tr>
              <td className="pr-5 font-medium text-neutral-500">Payment Terms:</td>
              <td className="font-medium text-neutral-900">{extras.paymentTerms || "—"}</td>
            </tr>
            <tr>
              <td className="pr-5 font-medium text-neutral-500">Due Date:</td>
              <td className="font-medium text-neutral-900">{formatDate(data.dueDate)}</td>
            </tr>
            <tr>
              <td className="pr-5 font-medium text-neutral-500">PO Number:</td>
              <td className="font-medium text-neutral-900">
                {data.poId ? (
                  <Link href={`/admin/purchase-orders/${data.poId}`} className="text-[#1e3a5f] no-underline">
                    {extras.poNumberRef || "—"}
                  </Link>
                ) : (
                  extras.poNumberRef || "—"
                )}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div className="mb-6 ml-auto w-full max-w-77.5 rounded-sm bg-[#ececec] px-3 py-2">
        <p className="text-center text-[18px] font-bold text-[#111]">
          Balance Due: {formatAed(balanceDue)}
        </p>
      </div>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="rounded-sm bg-neutral-700 text-left text-white">
              <th className="px-2 py-2 font-semibold">Item</th>
              <th className="w-16 px-2 py-2 text-right font-semibold">Quantity</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">Rate</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => {
              const amt = (Number(row.quantity) || 0) * (Number(row.price) || 0);
              return (
                <tr key={row.number} className="border-b border-neutral-200">
                  <td className="px-2 py-2 align-top text-neutral-900">
                    <span className="font-medium">{row.name}</span>
                    {row.description ? (
                      <span className="mt-0.5 block text-[10px] text-neutral-600">{row.description}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatAed(Number(row.price) || 0)}</td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{formatAed(amt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-6 flex justify-end">
        <table className="w-full max-w-xs text-[12px]">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-right text-neutral-500">Subtotal:</td>
              <td className="py-1 text-right font-medium tabular-nums">{formatAed(totals.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-right text-neutral-500">{taxLabel}:</td>
              <td className="py-1 text-right font-medium tabular-nums">{formatAed(totals.tax)}</td>
            </tr>
            <tr className="border-t border-neutral-300">
              <td className="py-2 pr-4 text-right font-bold text-neutral-900">Total:</td>
              <td className="py-2 text-right text-[18px] font-bold tabular-nums text-neutral-900">
                {formatAed(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {extras.amountInWords ? (
        <p className="mb-6 text-center text-[12px] italic leading-relaxed text-neutral-800">
          {extras.amountInWords}
        </p>
      ) : null}

      <div className="grid gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
        <BankBlock title="AED ACCOUNT DETAILS" b={extras.bankAed} />
        <BankBlock title="USD ACCOUNT DETAILS" b={extras.bankUsd} />
      </div>

      <footer className="mt-7 pt-2 text-[10px] text-neutral-600">
        <p className="font-medium text-neutral-800">{extras.footerTerms || "TERM:"}</p>
        <p className="mt-2 uppercase">{extras.footerCurrencyLine || "CURRENCY IN AED"}</p>
        <p className="mt-4 italic text-neutral-500">{extras.disclaimer}</p>
      </footer>
    </div>
  );
}
