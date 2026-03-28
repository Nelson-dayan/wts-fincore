"use client";

import type { QuotationBrandingState } from "@/lib/portals/quotation-preview-utils";
import {
  resolveClientSignatureSrc,
  resolveCompanySignatureSrc,
  resolveQuotationLogoSrc,
} from "@/lib/portals/quotation-preview-utils";

export type PreviewDocumentInfo = {
  quotationCode?: string;
  /** @deprecated legacy */
  geCode?: string;
  date: string;
  subject?: string;
  title?: string;
  description?: string;
  taxRate?: number;
  taxEnabled?: boolean;
};

export type PreviewSnapshotClient = {
  name: string;
  company?: string;
  address?: string;
  logoText?: string;
  signatureText?: string;
};

export type PreviewSnapshotCompany = {
  name: string;
  address?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  logoText?: string;
  signatureText?: string;
};

export type PreviewLineItem = {
  number: number;
  name: string;
  quantity: number;
  price: number;
};

export type PreviewPage = { pageNumber: number; items: PreviewLineItem[] };

export type PreviewTotals = { subtotal: number; tax: number; total: number };

export type QuotationDocumentPreviewProps = {
  id?: string;
  quotationNumberLabel: string;
  statusLabel?: string;
  documentInfo: PreviewDocumentInfo;
  clientSnapshot: PreviewSnapshotClient;
  companySnapshot: PreviewSnapshotCompany;
  pages: PreviewPage[];
  totals: PreviewTotals;
  quotationInfo: {
    leadTime?: string;
    terms?: string;
    validity?: string;
    remainingText?: string;
    confirmDate?: string;
  };
  branding: QuotationBrandingState;
  /** When true, omit internal-only chrome (used for print). */
  printMode?: boolean;
};

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Date(d).toLocaleDateString();
}

export function QuotationDocumentPreview({
  id = "quotation-print-root",
  quotationNumberLabel,
  statusLabel,
  documentInfo,
  clientSnapshot,
  companySnapshot,
  pages,
  totals,
  quotationInfo,
  branding,
  printMode = false,
}: QuotationDocumentPreviewProps) {
  const logoSrc = resolveQuotationLogoSrc(branding, companySnapshot);
  const companySig = resolveCompanySignatureSrc(branding, companySnapshot);
  const clientSig = resolveClientSignatureSrc(branding, clientSnapshot);

  return (
    <div
      id={id}
      className={
        printMode
          ? "bg-white text-black"
          : "max-h-[min(85vh,920px)] overflow-y-auto rounded-xl border border-border/80 bg-white p-6 text-[13px] leading-relaxed text-slate-900 shadow-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
      }
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs / arbitrary preview
              <img
                src={logoSrc}
                alt="Company logo"
                className="mb-3 max-h-16 w-auto max-w-[220px] object-contain object-left"
              />
            ) : (
              <div className="mb-3 text-lg font-semibold tracking-tight text-slate-800 dark:text-zinc-100">
                {companySnapshot.name}
              </div>
            )}
            <div className="space-y-0.5 text-[12px] text-slate-600 dark:text-zinc-400">
              {companySnapshot.address ? <p>{companySnapshot.address}</p> : null}
              {companySnapshot.email ? <p>{companySnapshot.email}</p> : null}
              {companySnapshot.website ? <p>{companySnapshot.website}</p> : null}
            </div>
          </div>
          <div className="text-right text-[12px] text-slate-600 dark:text-zinc-400">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
              Quotation
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-zinc-50">
              {quotationNumberLabel}
            </p>
            {statusLabel ? (
              <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-zinc-300">
                {statusLabel}
              </p>
            ) : null}
            {(documentInfo.quotationCode || documentInfo.geCode) ? (
              <p className="mt-2">
                Ref: {String(documentInfo.quotationCode ?? documentInfo.geCode ?? "").trim()}
              </p>
            ) : null}
            <p className="mt-1 font-medium text-slate-800 dark:text-zinc-200">
              Date: {fmtDate(documentInfo.date)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Bill to
            </p>
            <p className="font-semibold text-slate-900 dark:text-zinc-50">{clientSnapshot.name}</p>
            {clientSnapshot.company ? (
              <p className="text-slate-700 dark:text-zinc-300">{clientSnapshot.company}</p>
            ) : null}
            {clientSnapshot.address ? (
              <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-zinc-400">
                {clientSnapshot.address}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Subject & summary
            </p>
            {documentInfo.subject ? (
              <p className="font-medium text-slate-900 dark:text-zinc-50">{documentInfo.subject}</p>
            ) : null}
            {documentInfo.title ? <p className="mt-1 text-slate-700 dark:text-zinc-300">{documentInfo.title}</p> : null}
            {documentInfo.description ? (
              <p className="mt-2 text-[12px] text-slate-600 dark:text-zinc-400">{documentInfo.description}</p>
            ) : null}
          </div>
        </section>

        {pages.map((page) => (
          <section key={page.pageNumber}>
            {pages.length > 1 ? (
              <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-zinc-500">
                Page {page.pageNumber}
              </p>
            ) : null}
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
              <table className="w-full table-fixed text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Price</th>
                    <th className="px-3 py-2 text-right font-semibold">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {page.items.map((row) => (
                    <tr key={`${page.pageNumber}-${row.number}`}>
                      <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-zinc-300">{row.number}</td>
                      <td className="px-3 py-2 text-slate-900 dark:text-zinc-100">{row.name}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-zinc-300">{row.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-zinc-300">
                        {fmtMoney(row.price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-zinc-100">
                        {fmtMoney(row.quantity * row.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="ml-auto w-full max-w-xs space-y-1 rounded-lg border border-slate-200 p-3 text-[12px] dark:border-white/10">
          <div className="flex justify-between text-slate-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span className="tabular-nums text-slate-900 dark:text-zinc-100">{fmtMoney(totals.subtotal)}</span>
          </div>
          {documentInfo.taxEnabled ? (
            <div className="flex justify-between text-slate-600 dark:text-zinc-400">
              <span>Tax ({documentInfo.taxRate ?? 0}%)</span>
              <span className="tabular-nums text-slate-900 dark:text-zinc-100">{fmtMoney(totals.tax)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900 dark:border-white/10 dark:text-zinc-50">
            <span>Total</span>
            <span className="tabular-nums">{fmtMoney(totals.total)}</span>
          </div>
        </section>

        {(quotationInfo.leadTime ||
          quotationInfo.validity ||
          quotationInfo.terms ||
          quotationInfo.remainingText ||
          quotationInfo.confirmDate) ? (
          <section className="space-y-2 border-t border-slate-200 pt-4 text-[12px] text-slate-600 dark:border-white/10 dark:text-zinc-400">
            {quotationInfo.leadTime ? (
              <p>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Lead time: </span>
                {quotationInfo.leadTime}
              </p>
            ) : null}
            {quotationInfo.validity ? (
              <p>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Validity: </span>
                {quotationInfo.validity}
              </p>
            ) : null}
            {quotationInfo.confirmDate ? (
              <p>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Confirm by: </span>
                {fmtDate(quotationInfo.confirmDate)}
              </p>
            ) : null}
            {quotationInfo.remainingText ? (
              <p>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Note: </span>
                {quotationInfo.remainingText}
              </p>
            ) : null}
            {quotationInfo.terms ? (
              <p className="whitespace-pre-line">
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Terms &amp; conditions</span>
                <br />
                {quotationInfo.terms}
              </p>
            ) : null}
          </section>
        ) : null}

        {(companySig || clientSig) && (
          <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 pt-6 dark:border-white/10">
            {companySig ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-zinc-500">
                  Authorized signature
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={companySig}
                  alt="Company signature"
                  className="max-h-20 w-auto max-w-[200px] object-contain object-left"
                />
              </div>
            ) : null}
            {clientSig ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500 dark:text-zinc-500">
                  Client acknowledgement
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clientSig}
                  alt="Client signature"
                  className="max-h-20 w-auto max-w-[200px] object-contain object-left"
                />
              </div>
            ) : null}
          </footer>
        )}
      </div>
    </div>
  );
}
