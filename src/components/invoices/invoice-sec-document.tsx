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
      <table className="w-full border border-neutral-400 text-[10px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-neutral-300">
              <td className="w-[32%] border-r border-neutral-300 bg-neutral-100 px-1.5 py-1 font-medium text-neutral-700">
                {k}
              </td>
              <td className="px-1.5 py-1 text-neutral-900">{v || "—"}</td>
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
  const taxRate = documentInfo.taxRate ?? 5;
  const taxLabel = documentInfo.taxEnabled !== false ? `Tax (${taxRate}%)` : "Tax";

  const lines = pages.flatMap((p) => p.items);
  const balanceDue = totals.total ?? 0;

  const shell =
    mode === "print"
      ? "bg-white p-8 text-neutral-900 print:p-6"
      : "rounded-lg border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm print:border-0 print:shadow-none";

  return (
    <div className={`mx-auto max-w-[210mm] ${shell}`} id="invoice-print-root">
      <header className="mb-5 flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="min-w-0 text-[11px] leading-snug">
            <p className="text-sm font-bold text-neutral-900">{companySnapshot.name || "—"}</p>
            <p className="whitespace-pre-wrap text-neutral-700">{companySnapshot.address || ""}</p>
            {extras.companyTrn ? (
              <p className="mt-1 font-medium text-neutral-800">TRN: {extras.companyTrn}</p>
            ) : null}
          </div>
        </div>
        <div className="text-right sm:min-w-50">
          <p className="text-2xl font-bold tracking-tight text-neutral-900">
            {documentInfo.title || "INVOICE"}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-neutral-800">{data.invoiceNumber}</p>
        </div>
      </header>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-neutral-600">Bill To</p>
          <p className="mt-1 text-[11px] font-semibold text-neutral-900">{clientSnapshot.name || "—"}</p>
          <p className="text-[11px] text-neutral-800">{clientSnapshot.company}</p>
          <p className="whitespace-pre-wrap text-[11px] text-neutral-700">{clientSnapshot.address}</p>
          {extras.clientTrn ? (
            <p className="mt-1 text-[11px] font-medium">TRN: {extras.clientTrn}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-neutral-600">Ship To</p>
          <p className="mt-1 text-[11px] font-semibold text-neutral-900">
            {extras.shipToCompany || clientSnapshot.company || "—"}
          </p>
          <p className="whitespace-pre-wrap text-[11px] text-neutral-700">
            {extras.shipToAddress || clientSnapshot.address || ""}
          </p>
          {extras.shipToTrn ? (
            <p className="mt-1 text-[11px] font-medium">TRN: {extras.shipToTrn}</p>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <table className="ml-auto text-right text-[11px]">
          <tbody>
            <tr>
              <td className="pr-4 font-medium text-neutral-600">Date</td>
              <td className="font-semibold text-neutral-900">{formatDate(documentInfo.date)}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium text-neutral-600">Payment Terms</td>
              <td className="font-semibold text-neutral-900">{extras.paymentTerms || "—"}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium text-neutral-600">Due Date</td>
              <td className="font-semibold text-neutral-900">{formatDate(data.dueDate)}</td>
            </tr>
            <tr>
              <td className="pr-4 font-medium text-neutral-600">PO Number</td>
              <td className="font-semibold text-neutral-900">
                {data.poId ? (
                  <Link href={`/admin/purchase-orders/${data.poId}`} className="text-[#1e3a5f] underline">
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

      <div className="mb-4 rounded-sm bg-neutral-200 px-3 py-2.5">
        <p className="text-center text-sm font-semibold text-neutral-900">
          Balance Due: {formatAed(balanceDue)}
        </p>
      </div>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-neutral-700 text-left text-white">
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

      <div className="mb-5 flex justify-end">
        <table className="w-full max-w-xs text-[11px]">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-right text-neutral-600">Subtotal</td>
              <td className="py-1 text-right font-medium tabular-nums">{formatAed(totals.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-right text-neutral-600">{taxLabel}</td>
              <td className="py-1 text-right font-medium tabular-nums">{formatAed(totals.tax)}</td>
            </tr>
            <tr className="border-t border-neutral-300">
              <td className="py-2 pr-4 text-right font-bold text-neutral-900">Total</td>
              <td className="py-2 text-right text-sm font-bold tabular-nums text-neutral-900">
                {formatAed(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {extras.amountInWords ? (
        <p className="mb-6 border-t border-neutral-200 pt-3 text-center text-[11px] italic leading-relaxed text-neutral-800">
          {extras.amountInWords}
        </p>
      ) : null}

      <div className="grid gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
        <BankBlock title="AED ACCOUNT DETAILS" b={extras.bankAed} />
        <BankBlock title="USD ACCOUNT DETAILS" b={extras.bankUsd} />
      </div>

      <footer className="mt-6 border-t border-neutral-200 pt-3 text-[10px] text-neutral-600">
        <p className="font-medium text-neutral-800">{extras.footerTerms || "TERM:"}</p>
        <p className="mt-1 uppercase">{extras.footerCurrencyLine || "CURRENCY IN AED"}</p>
        <p className="mt-2 italic text-neutral-500">{extras.disclaimer}</p>
      </footer>
    </div>
  );
}
