"use client";

import Link from "next/link";
import { isImageSrc } from "@/lib/utils/is-image-src";

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
  invoiceType?: "aed" | "usd";
  currency?: string;
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
    bankAedTitle?: string;
    bankUsdTitle?: string;
    footerTerms?: string;
    footerCurrencyLine?: string;
    disclaimer?: string;
    amountInWords?: string;
    showBankAed?: boolean;
    showBankUsd?: boolean;
    hideShipping?: boolean;
  };
  dueDate?: string;
  poId?: string;
};

function formatCurrency(n: number, formatting: "aed" | "usd", currency: string): string {
  const isUsdStyle = formatting === "usd";
  const locale = isUsdStyle ? "en-US" : "en-IN";
  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  
  if (isUsdStyle) return num;
  return `${currency} ${num}`;
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
  const invoiceType = data.invoiceType === "usd" ? "usd" : "aed";
  const isUsd = invoiceType === "usd";
  const taxLabel = documentInfo.taxEnabled !== false ? `Tax (${taxRate}%)` : "Tax";

  const lines = pages.flatMap((p) => p.items);
  const balanceDue = totals.total ?? 0;
  const currency = data.currency || (isUsd ? "USD" : "AED");
  const fmt = (n: number) => formatCurrency(n, invoiceType, currency);

  const shell =
    mode === "print"
      ? "bg-white p-8 text-neutral-900 print:p-0"
      : "bg-white p-8 text-neutral-900 print:border-0 print:p-0 print:shadow-none";

  if (isUsd) {
    const usdBankRows = (b: InvoiceDocBank | undefined): [string, string][] => [
      ["Name", String(b?.accountName ?? "")],
      ["Account No", String(b?.accountNo ?? "")],
      ["IBAN", String(b?.iban ?? "")],
      ["Bank Name", String(b?.bankName ?? "")],
      ["Swift Code", String(b?.swift ?? "")],
    ];

    return (
      <div
        className={`box-border mx-auto w-full max-w-[210mm] ${shell}`}
        id="invoice-print-root"
        data-invoice-a4="true"
      >
        <header className="mb-5 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
            {isImageSrc(companySnapshot.logoUrl) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={companySnapshot.logoUrl} alt="" className="h-16 w-auto max-w-34 object-contain" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[#1e3a5f] text-[10px] font-bold leading-tight text-white">
                SEC
                <br />
                LANCE
              </div>
            )}
            </div>
            <div className="text-[11px] leading-snug">
              <p className="font-bold text-black">{companySnapshot.name || "—"}</p>
              <p className="whitespace-pre-wrap">{companyAddress || companySnapshot.address || ""}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[40px] font-light leading-none tracking-tight text-[#1e3552]">
              {documentInfo.title || "INVOICE"}
            </p>
            <p className="mt-1 text-[12px] whitespace-nowrap text-[#5c5c5c]">{data.invoiceNumber}</p>
          </div>
        </header>

        <div className={`mb-3 grid gap-4 text-[12px] ${extras.hideShipping === true ? "grid-cols-[1.75fr_1.25fr]" : "grid-cols-[1fr_1fr_1.25fr]"}`}>
          <div>
            <p className="mb-1 text-[15px] font-light text-[#666]">Bill To:</p>
            <p className="font-bold">{clientSnapshot.name || "—"}</p>
            <p className="font-bold">{clientSnapshot.company || ""}</p>
            <p className="whitespace-pre-wrap leading-tight">{clientSnapshot.address || ""}</p>
          </div>
          {extras.hideShipping !== true && (
            <div>
              <p className="mb-1 text-[15px] font-light text-[#666]">Ship To:</p>
              <p className="font-bold">{extras.shipToCompany || clientSnapshot.company || "—"}</p>
              <p className="whitespace-pre-wrap leading-tight">
                {extras.shipToAddress || clientSnapshot.address || ""}
              </p>
            </div>
          )}
          <div className="pt-2">
            <table className="w-full text-[12px]">
              <tbody>
                <tr>
                  <td className=" text-[#6b6b6b]">Date:</td>
                  <td className="whitespace-nowrap">{formatDate(documentInfo.date)}</td>
                </tr>
                <tr>
                  <td className="text-[#6b6b6b]">Payment Terms:</td>
                  <td className="whitespace-nowrap">{extras.paymentTerms || "—"}</td>
                </tr>
                <tr>
                  <td className="text-[#6b6b6b]">Due Date:</td>
                  <td className="whitespace-nowrap">{formatDate(data.dueDate)}</td>
                </tr>
                <tr>
                  <td className="text-[#6b6b6b]">PO Number:</td>
                  <td className="whitespace-nowrap">{extras.poNumberRef || "—"}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 whitespace-nowrap bg-[#ededed] px-3 py-1 text-[18px] font-bold leading-tight text-black">
              <span className="mr-4 text-[17px] font-semibold">Balance Due:</span> {fmt(balanceDue)}
            </div>
          </div>
        </div>

        <div className="mb-3 overflow-hidden border-2 border-black">
          <table className="w-full border-collapse text-[10px] leading-[1.35]">
            <thead>
              <tr className="border-b-2 border-black bg-[#f5f5f5] text-center">
                <th className="border-r border-black px-1 py-1.5">Sl.</th>
                <th className="border-r border-black px-1 py-1.5 text-center">Description</th>
                <th className="border-r border-black px-1 py-1.5">Unit</th>
                <th className="border-r border-black px-1 py-1.5">Qty.</th>
                <th className="border-r border-black px-1 py-1.5">Rate</th>
                <th className="border-r border-black px-1 py-1.5">Gross Amount</th>
                <th className="border-r border-black px-1 py-1.5">Disc.</th>
                <th className="border-r border-black px-1 py-1.5">Taxable Amount ({currency})</th>
                <th className="border-r border-black px-1 py-1.5">VAT %</th>
                <th className="border-r border-black px-1 py-1.5">VAT Amount</th>
                <th className="px-1 py-1.5">Net Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, idx) => {
                const qty = Number(row.quantity) || 0;
                const rate = Number(row.price) || 0;
                const gross = qty * rate;
                return (
                  <tr key={row.number} className="border-b border-black">
                    <td className="border-r border-black px-1 py-1.5 text-center">{idx + 1}</td>
                    <td className="border-r border-black px-1 py-1.5 text-center font-semibold">{row.name || "—"}</td>
                    <td className="border-r border-black px-1 py-1.5 text-center">1</td>
                    <td className="border-r border-black px-1 py-1.5 text-center">{qty}</td>
                    <td className="border-r border-black px-1 py-1.5 text-right">{fmt(rate)}</td>
                    <td className="border-r border-black px-1 py-1.5 text-right">{fmt(gross)}</td>
                    <td className="border-r border-black px-1 py-1.5 text-center">-</td>
                    <td className="border-r border-black px-1 py-1.5 text-right">{fmt(gross)}</td>
                    <td className="border-r border-black px-1 py-1.5 text-center">-</td>
                    <td className="border-r border-black px-1 py-1.5 text-right">-</td>
                    <td className="px-1 py-1.5 text-right">{fmt(gross)}</td>
                  </tr>
                );
              })}
              <tr className="border-b border-black font-bold">
                <td className="border-r border-black px-1 py-1 text-right" colSpan={5}>
                  Total
                </td>
                <td className="border-r border-black px-1 py-1 text-right">{fmt(totals.subtotal)}</td>
                <td className="border-r border-black px-1 py-1 text-center">-</td>
                <td className="border-r border-black px-1 py-1 text-right">{fmt(totals.subtotal)}</td>
                <td className="border-r border-black px-1 py-1 text-center">-</td>
                <td className="border-r border-black px-1 py-1 text-right">-</td>
                <td className="px-1 py-1 text-right">{fmt(totals.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-[1fr_49%] border-t border-black">
            <div className="min-h-20" />
            <div className="border-l border-black text-[10px]">
              <div className="grid grid-cols-[1fr_auto] border-b border-black">
                <div className="border-r border-black px-2 py-1 font-bold">Taxable Amount</div>
                <div className="min-w-28 px-2 py-1 text-right font-bold">{fmt(totals.subtotal)}</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] border-b border-black">
                <div className="border-r border-black px-2 py-1 font-bold">Vat Total</div>
                <div className="px-2 py-1 text-right">-</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] border-b border-black">
                <div className="border-r border-black px-2 py-1 font-bold">Discount</div>
                <div className="px-2 py-1 text-right">-</div>
              </div>
              <div className="grid grid-cols-[1fr_auto]">
                <div className="border-r border-black px-2 py-1 text-[16px] font-bold">Total</div>
                <div className="px-2 py-1 text-right text-[16px] font-bold">{fmt(totals.total)}</div>
              </div>
            </div>
          </div>
        </div>

        <p className="mb-1 text-right text-[16px] font-bold">
          {String(extras.amountInWords ?? `${totals.total.toFixed(2)} US Dollars Only.`)}
        </p>

        <div className="mb-2 text-[10px] leading-[1.4]">
          {(extras.showBankUsd !== false || extras.showBankAed !== false) && (
            <>
              <p className="font-bold">Notes:</p>
              {extras.showBankUsd !== false && (
                <div className="mb-2 border border-black">
                  <p className="border-b border-black px-2 py-1 text-[12px] font-bold">
                    {extras.bankUsdTitle || "USD ACCOUNT DETAILS"}:
                  </p>
                  <table className="w-full border-collapse text-[10px] leading-[1.45]">
                    <tbody>
                      {usdBankRows(extras.bankUsd).map(([k, v]) => (
                        <tr key={`usd-${k}`} className="border-b border-black last:border-b-0">
                          <td className="w-[43%] border-r border-black px-2 py-1">{k}</td>
                          <td className="px-2 py-1">{v || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {extras.showBankAed !== false && (
                <div className="mb-2 border border-black">
                  <p className="border-b border-black px-2 py-1 text-[12px] font-bold">
                    {extras.bankAedTitle || "AED ACCOUNT DETAILS"}:
                  </p>
                  <table className="w-full border-collapse text-[10px] leading-[1.45]">
                    <tbody>
                      {usdBankRows(extras.bankAed).map(([k, v]) => (
                        <tr key={`aed-${k}`} className="border-b border-black last:border-b-0">
                          <td className="w-[43%] border-r border-black px-2 py-1">{k}</td>
                          <td className="px-2 py-1">{v || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <p className="mt-1 font-bold">{extras.footerTerms || "Terms:"}</p>
          <p className="mt-1 uppercase">{extras.footerCurrencyLine || `CURRENCY IN ${currency}`}</p>
        </div>

        <footer className="pt-1 text-[10px] text-neutral-700">
          <p>{extras.disclaimer || "This is an electronically generated invoice, hence does not require signature."}</p>
        </footer>
      </div>
    );
  }

  /** Screen: max A4 width; print: full printable width (margins come from @page). */
  return (
    <div
      className={`box-border mx-auto w-full max-w-[210mm] ${shell}`}
      id="invoice-print-root"
      data-invoice-a4="true"
    >
      <header className="mb-4 flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {isImageSrc(companySnapshot.logoUrl) ? (
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
          <p
            className={
              isUsd
                ? "text-[48px] font-light leading-none tracking-tight text-[#1e3552]"
                : "text-[38px] font-light leading-none tracking-tight text-[#1e3552]"
            }
          >
            {documentInfo.title || "INVOICE"}
          </p>
          <p className="mt-2 font-mono text-[11px] font-medium text-neutral-500">{data.invoiceNumber}</p>
        </div>
      </header>

      <div className={`mb-5 grid gap-4 ${extras.hideShipping === true ? "sm:grid-cols-[1.7fr_1.3fr]" : "sm:grid-cols-[1fr_1fr_1.3fr]"}`}>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-neutral-500">Bill To:</p>
          <p className="mt-0.5 text-[12px] font-bold text-neutral-900">{clientSnapshot.name || "—"}</p>
          <p className="text-[12px] font-bold text-neutral-900">{clientSnapshot.company}</p>
          <p className="whitespace-pre-wrap text-[12px] font-semibold leading-tight text-neutral-900">{clientSnapshot.address}</p>
          {extras.clientTrn ? (
            <p className="mt-1 text-[12px] font-semibold">TRN: {extras.clientTrn}</p>
          ) : null}
        </div>
        {extras.hideShipping !== true && (
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
        )}
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
          Balance Due: {fmt(balanceDue)}
        </p>
      </div>

      <div className="mb-4 overflow-x-auto">
        <table className={`w-full border-collapse text-[11px] ${isUsd ? "border-2 border-black" : ""}`}>
          <thead>
            <tr
              className={
                isUsd
                  ? "border-b-2 border-black bg-[#f2f2f2] text-left text-black"
                  : "rounded-sm bg-neutral-700 text-left text-white"
              }
            >
              <th className="px-2 py-2 font-semibold">{isUsd ? "Description" : "Item"}</th>
              <th className="w-16 px-2 py-2 text-right font-semibold">{isUsd ? "Qty." : "Quantity"}</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">Rate</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => {
              const amt = (Number(row.quantity) || 0) * (Number(row.price) || 0);
              return (
                <tr key={row.number} className={isUsd ? "border-b border-black" : "border-b border-neutral-200"}>
                  <td className="px-2 py-2 align-top text-neutral-900">
                    <span className="font-medium">{row.name}</span>
                    {row.description ? (
                      <span className="mt-0.5 block text-[10px] text-neutral-600">{row.description}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(row.price) || 0)}</td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(amt)}</td>
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
              <td className="py-1 text-right font-medium tabular-nums">{fmt(totals.subtotal)}</td>
            </tr>
            {documentInfo.taxEnabled !== false ? (
              <tr>
                <td className="py-1 pr-4 text-right text-neutral-500">{taxLabel}:</td>
                <td className="py-1 text-right font-medium tabular-nums">{fmt(totals.tax)}</td>
              </tr>
            ) : null}
            <tr className="border-t border-neutral-300">
              <td className="py-2 pr-4 text-right font-bold text-neutral-900">Total:</td>
              <td className="py-2 text-right text-[18px] font-bold tabular-nums text-neutral-900">
                {fmt(totals.total)}
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

      {(extras.showBankAed !== false || extras.showBankUsd !== false) && (
        <div className={`grid gap-4 border-t border-neutral-200 pt-4 ${
          (extras.showBankAed !== false && extras.showBankUsd !== false) ? "sm:grid-cols-2" : "grid-cols-1"
        }`}>
          {extras.showBankAed !== false && (
            <BankBlock title={extras.bankAedTitle || "AED ACCOUNT DETAILS"} b={extras.bankAed} />
          )}
          {extras.showBankUsd !== false && (
            <BankBlock title={extras.bankUsdTitle || "USD ACCOUNT DETAILS"} b={extras.bankUsd} />
          )}
        </div>
      )}

      <footer className="mt-7 pt-2 text-[10px] text-neutral-600">
        <p className="font-medium text-neutral-800">{extras.footerTerms || "TERM:"}</p>
        <p className="mt-2 uppercase">{extras.footerCurrencyLine || "CURRENCY IN AED"}</p>
        <p className="mt-4 italic text-neutral-500">{extras.disclaimer}</p>
      </footer>
    </div>
  );
}
