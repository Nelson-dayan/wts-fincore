import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { applyExchangeRate } from "@/lib/finance/engine";
import { getNextFiscalSequence } from "@/lib/services/business/counter.service";
import { generateStandardDocumentRef } from "@/lib/utils/document-reference";

type POType = "client" | "internal";

export async function generatePONumber(
  userId: string,
  companyCode = "SDT",
  companyId?: string
): Promise<{ poNumber: string; seqValue: number; year: string }> {
  const currentYear = new Date().getFullYear().toString();
  const scopeKey = companyId || companyCode;
  const seqValue = await getNextFiscalSequence("purchase_order_number", currentYear, "PurchaseOrder", userId, undefined, scopeKey);
  const poNumber = generateStandardDocumentRef({ docType: "PO", companyCode, sequence: seqValue });
  return { poNumber, seqValue, year: currentYear };
}

export interface CreatePurchaseOrderInput {
  poNumber: string;
  projectId: Types.ObjectId | string;
  quotationId: Types.ObjectId | string;
  type: POType;
  fileUrl?: string;
  externalPoNumber?: string;
  totalAmount?: number;
  status?: "linked" | "active" | "completed";
  createdBy: Types.ObjectId | string;
}

async function assertQuotationRules(
  input: CreatePurchaseOrderInput,
  session: ClientSession
) {
  const quotation = await QuotationModel.findById(input.quotationId)
    .select("status projectId currency")
    .session(session)
    .lean();

  if (!quotation) {
    throw new Error("Quotation not found for purchase order");
  }

  if (String(quotation.projectId) !== String(input.projectId)) {
    throw new Error("Purchase order projectId must match quotation projectId");
  }

  /** Client PO may be linked even if quotation was rejected (record / audit). Internal still requires approved below. */
  if (input.type === "internal" && quotation.status !== "approved") {
    throw new Error("Internal purchase orders require an approved quotation");
  }

  return quotation;
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<{ id: string }> {
  const db = await connectDB();
  const session = await db.startSession();

  try {
    let createdId = "";
    await session.withTransaction(async () => {
      const quotation = await assertQuotationRules(input, session);

      let totalAmountBase: number | undefined;
      const defaultExchangeRate = 1;
      
      if (input.totalAmount != null) {
        totalAmountBase = applyExchangeRate(input.totalAmount, defaultExchangeRate);
      }

      const created = await PurchaseOrderModel.create(
        [
          {
            poNumber: input.poNumber,
            projectId: input.projectId,
            quotationId: input.quotationId,
            type: input.type,
            fileUrl: input.type === "client" ? String(input.fileUrl ?? "").trim() : "",
            externalPoNumber: input.externalPoNumber ?? "",
            generatedFromQuotation: input.type === "internal",
            currency: quotation.currency ?? "AED",
            exchangeRate: defaultExchangeRate,
            totalAmount: input.totalAmount,
            totalAmountBase,
            status: input.status ?? "linked",
            createdBy: input.createdBy,
          },
        ],
        { session }
      );

      createdId = String(created[0]?._id ?? "");
    });

    return { id: createdId };
  } finally {
    await session.endSession();
  }
}
