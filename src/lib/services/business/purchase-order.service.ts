import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrderModel, QuotationModel } from "@/lib/db/models";

type POType = "client" | "internal";

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
): Promise<void> {
  const quotation = await QuotationModel.findById(input.quotationId)
    .select("status projectId")
    .session(session);

  if (!quotation) {
    throw new Error("Quotation not found for purchase order");
  }

  if (String(quotation.projectId) !== String(input.projectId)) {
    throw new Error("Purchase order projectId must match quotation projectId");
  }

  if (quotation.status !== "approved") {
    throw new Error(
      "Both client and internal purchase orders require an approved quotation"
    );
  }
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<{ id: string }> {
  const db = await connectDB();
  const session = await db.startSession();

  try {
    let createdId = "";
    await session.withTransaction(async () => {
      await assertQuotationRules(input, session);

      if (input.type === "client" && !input.fileUrl) {
        throw new Error("Client purchase orders require fileUrl");
      }

      const created = await PurchaseOrderModel.create(
        [
          {
            poNumber: input.poNumber,
            projectId: input.projectId,
            quotationId: input.quotationId,
            type: input.type,
            fileUrl: input.type === "client" ? input.fileUrl : "",
            externalPoNumber: input.externalPoNumber ?? "",
            generatedFromQuotation: input.type === "internal",
            totalAmount: input.totalAmount,
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
