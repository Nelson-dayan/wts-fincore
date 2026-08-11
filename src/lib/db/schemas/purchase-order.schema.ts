import { Schema, Types } from "mongoose";
import { optionalDecimalField, schemaOptions } from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";


export const purchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    quotationId: { type: Types.ObjectId, ref: "Quotation", required: true, index: true },
    type: { type: String, enum: ["client", "internal"], required: true, index: true },
    fileUrl: { type: String, default: "" },
    externalPoNumber: { type: String, default: "" },
    generatedFromQuotation: { type: Boolean, default: false },
    currency: { type: String, enum: SUPPORTED_CURRENCY_VALUES, default: DEFAULT_CURRENCY },
    exchangeRate: optionalDecimalField,
    totalAmount: optionalDecimalField,
    totalAmountBase: optionalDecimalField,
    status: {
      type: String,
      enum: ["linked", "active", "completed"],
      default: "linked",
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
  },
  schemaOptions
);

purchaseOrderSchema.pre("validate", function () {
  /** Client PO may be created as a quotation link first; signed file can be added later via PATCH. */
  if (this.type === "internal") {
    this.fileUrl = "";
    if (!this.generatedFromQuotation) {
      throw new Error(
        "generatedFromQuotation must be true for internal purchase orders"
      );
    }
  }
});

purchaseOrderSchema.index({ projectId: 1, quotationId: 1, createdAt: -1 });
