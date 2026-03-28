import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { InvoiceModel, QuotationModel } from "@/lib/db/models";

export type DocumentFormat = "pdf" | "docx";
export type DocumentEntity = "quotation" | "invoice";

export interface RenderPayload {
  entity: DocumentEntity;
  id: string;
  documentNumber: string;
  projectId: string;
  documentInfo: unknown;
  clientSnapshot: unknown;
  companySnapshot: unknown;
  pages: unknown[];
  totals: unknown;
  /** Quotation visual overrides; invoices use branding on the document. */
  branding?: unknown;
}

export interface ExportAdapter {
  format: DocumentFormat;
  export(payload: RenderPayload): Promise<Buffer>;
}

export class DocumentExportService {
  private readonly adapters = new Map<DocumentFormat, ExportAdapter>();

  registerAdapter(adapter: ExportAdapter): void {
    this.adapters.set(adapter.format, adapter);
  }

  async buildQuotationPayload(quotationId: Types.ObjectId | string): Promise<RenderPayload> {
    await connectDB();
    const quotation = await QuotationModel.findById(quotationId).lean();
    if (!quotation) throw new Error("Quotation not found");

    return {
      entity: "quotation",
      id: String(quotation._id),
      documentNumber: quotation.quotationNumber,
      projectId: String(quotation.projectId),
      documentInfo: quotation.documentInfo,
      clientSnapshot: quotation.clientSnapshot,
      companySnapshot: quotation.companySnapshot,
      pages: quotation.pages ?? [],
      totals: quotation.totals,
      branding: (quotation as { branding?: unknown }).branding,
    };
  }

  async buildInvoicePayload(invoiceId: Types.ObjectId | string): Promise<RenderPayload> {
    await connectDB();
    const invoice = await InvoiceModel.findById(invoiceId).lean();
    if (!invoice) throw new Error("Invoice not found");

    return {
      entity: "invoice",
      id: String(invoice._id),
      documentNumber: invoice.invoiceNumber,
      projectId: String(invoice.projectId),
      documentInfo: invoice.documentInfo,
      clientSnapshot: invoice.clientSnapshot,
      companySnapshot: invoice.companySnapshot,
      pages: invoice.pages ?? [],
      totals: invoice.totals,
      branding: invoice.branding,
    };
  }

  async exportDocument(params: {
    entity: DocumentEntity;
    id: Types.ObjectId | string;
    format: DocumentFormat;
  }): Promise<Buffer> {
    const adapter = this.adapters.get(params.format);
    if (!adapter) {
      throw new Error(
        `No export adapter found for format '${params.format}'. Register PDF/DOCX adapters before exporting.`
      );
    }

    const payload =
      params.entity === "quotation"
        ? await this.buildQuotationPayload(params.id)
        : await this.buildInvoicePayload(params.id);

    return adapter.export(payload);
  }
}
