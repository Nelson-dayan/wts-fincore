import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import {
  ClientModel,
  CompanyModel,
  ProjectModel,
  QuotationModel,
} from "@/lib/db/models";
import { decimalToNumber } from "@/lib/services/business/money";
import { computeTotals } from "@/lib/finance/engine";

export type QuotationItemInput = {
  number: number;
  name: string;
  displayName?: string;
  description?: string;
  length?: number;
  width?: number;
  quantity: number;
  price: number;
};

export type QuotationPageInput = {
  pageNumber: number;
  items: QuotationItemInput[];
};

export function toDecimal128(value: number): mongoose.Types.Decimal128 {
  const n = Number.isFinite(value) ? value : 0;
  return mongoose.Types.Decimal128.fromString(n.toFixed(4));
}

export function computeQuotationTotals(
  pages: QuotationPageInput[],
  taxRate: number,
  taxEnabled: boolean,
  discount: number = 0
): { subtotal: number; tax: number; total: number } {
  const items = pages.flatMap(page => page.items ?? []).map(item => ({
    quantity: Number(item.quantity ?? 0),
    unitPrice: decimalToNumber(item.price)
  }));

  return computeTotals(items, discount, taxEnabled ? taxRate : 0);
}

import { getNextFiscalSequence } from "@/lib/services/business/counter.service";
import { generateStandardDocumentRef } from "@/lib/utils/document-reference";

export async function generateQuotationNumber(
  userId: string,
  companyCode = "SDT",
  companyId?: string
): Promise<{ quotationNumber: string; seqValue: number; year: string }> {
  const currentYear = new Date().getFullYear().toString();
  const scopeKey = companyId || companyCode;
  const seqValue = await getNextFiscalSequence("quotation_number", currentYear, "Quotation", userId, undefined, scopeKey);
  const quotationNumber = generateStandardDocumentRef({ docType: "QT", companyCode, sequence: seqValue });
  return { quotationNumber, seqValue, year: currentYear };
}

export async function buildQuotationSnapshots(projectId: string): Promise<{
  clientSnapshot: {
    name: string;
    company: string;
    address: string;
    logoText: string;
    signatureText: string;
  };
  companySnapshot: {
    name: string;
    address: string;
    email: string;
    website: string;
    logoUrl: string;
    logoText: string;
    signatureText: string;
  };
}> {
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) {
    throw new Error("Project not found");
  }
  const client = await ClientModel.findById(project.clientId).lean();
  if (!client) {
    throw new Error("Client not found for project");
  }
  const targetCompanyId = (project as any).companyId;
  const company = targetCompanyId
    ? await CompanyModel.findById(targetCompanyId).lean()
    : await CompanyModel.findOne({ isPrimary: true }).sort({ updatedAt: -1 }).lean();
  if (!company) {
    throw new Error("Target company entity is not configured. Complete company settings first.");
  }

  const c = client as {
    clientLogoText?: string;
    clientLogoUrl?: string;
    clientSignatureText?: string;
  };
  const logoText = String(c.clientLogoText ?? "").trim();
  const logoUrl = String(c.clientLogoUrl ?? "").trim();

  return {
    clientSnapshot: {
      name: String(client.name ?? "").trim(),
      company: String(client.company ?? "").trim(),
      address: String(client.address ?? "").trim(),
      logoText: logoText || logoUrl,
      signatureText: String(c.clientSignatureText ?? "").trim(),
    },
    companySnapshot: {
      name: String(company.name ?? "").trim(),
      address: String(company.address ?? "").trim(),
      email: String(company.email ?? "").trim(),
      website: String(company.website ?? "").trim(),
      logoUrl: "",
      logoText: String((company as { logoText?: string }).logoText ?? "").trim(),
      signatureText: String((company as { signatureText?: string }).signatureText ?? "").trim(),
    },
  };
}

export function pagesFromStoredDoc(doc: {
  pages?: Array<{
    pageNumber: number;
    items: Array<Record<string, unknown>>;
  }>;
}): QuotationPageInput[] {
  const raw = doc.pages ?? [];
  if (raw.length === 0) {
    throw new Error("Quotation has no pages");
  }
  return raw.map((p) => ({
    pageNumber: p.pageNumber,
    items: p.items.map((item) => ({
      number: Number(item.number),
      name: String(item.name ?? "").trim(),
      displayName: String(item.displayName ?? "").trim(),
      description: String(item.description ?? "").trim(),
      length: item.length !== undefined ? Number(item.length) : undefined,
      width: item.width !== undefined ? Number(item.width) : undefined,
      quantity: Number(item.quantity ?? 0),
      price: decimalToNumber(item.price),
    })),
  }));
}

export function normalizePagesInput(raw: unknown): QuotationPageInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("At least one page with line items is required");
  }
  const pages: QuotationPageInput[] = [];
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const pageNumber = Number((p as { pageNumber?: unknown }).pageNumber);
    const itemsRaw = (p as { items?: unknown }).items;
    if (!Number.isFinite(pageNumber) || pageNumber < 1) {
      throw new Error("Each page must have a valid pageNumber");
    }
    if (!Array.isArray(itemsRaw)) {
      throw new Error("Each page must include an items array");
    }
    const items: QuotationItemInput[] = [];
    for (const row of itemsRaw) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      const number = Number(r.number);
      const name = String(r.name ?? "").trim();
      const quantity = Number(r.quantity ?? 0);
      const price = decimalToNumber(r.price);
      if (!Number.isFinite(number) || number < 1) {
        throw new Error("Each line item needs a valid number");
      }
      if (!name) {
        throw new Error("Each line item needs a name");
      }
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("Each line item needs a valid quantity");
      }
      items.push({
        number,
        name,
        displayName: String(r.displayName ?? "").trim(),
        description: String(r.description ?? "").trim(),
        length: r.length !== undefined ? Number(r.length) : undefined,
        width: r.width !== undefined ? Number(r.width) : undefined,
        quantity,
        price,
      });
    }
    if (items.length === 0) {
      throw new Error("Each page must have at least one line item");
    }
    pages.push({ pageNumber, items });
  }
  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  return pages;
}
