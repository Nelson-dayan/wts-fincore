import { Schema, Types } from "mongoose";
import {
  clientSnapshotSchema,
  companySnapshotSchema,
  decimalField,
  documentInfoSchema,
  schemaOptions,
  totalsSchema,
} from "@/lib/db/schemas/shared.schema";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCY_VALUES } from "@/lib/constants/finance";


const bankDetailSchema = new Schema(
  {
    accountName: { type: String, default: "" },
    accountNo: { type: String, default: "" },
    iban: { type: String, default: "" },
    bankName: { type: String, default: "" },
    swift: { type: String, default: "" },
  },
  { _id: false }
);

const invoiceExtrasSchema = new Schema(
  {
    paymentTerms: { type: String, default: "30 DAYS" },
    companyTrn: { type: String, default: "" },
    clientTrn: { type: String, default: "" },
    shipToCompany: { type: String, default: "" },
    shipToAddress: { type: String, default: "" },
    shipToTrn: { type: String, default: "" },
    poNumberRef: { type: String, default: "" },
    bankAed: { type: bankDetailSchema, default: () => ({}) },
    bankUsd: { type: bankDetailSchema, default: () => ({}) },
    bankAedTitle: { type: String, default: "AED ACCOUNT DETAILS" },
    bankUsdTitle: { type: String, default: "USD ACCOUNT DETAILS" },
    footerTerms: { type: String, default: "" },
    footerCurrencyLine: { type: String, default: `CURRENCY IN ${DEFAULT_CURRENCY}` },
    disclaimer: {
      type: String,
      default:
        "This is an electronically generated invoice, hence does not require signature.",
    },
    amountInWords: { type: String, default: "" },
    _hiddenUntilSaved: { type: Boolean, default: false },
    showBankAed: { type: Boolean, default: true },
    showBankUsd: { type: Boolean, default: true },
    hideShipping: { type: Boolean, default: false },
  },
  { _id: false }
);

const invoiceItemSchema = new Schema(
  {
    number: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    price: decimalField,
  },
  { _id: false }
);

const invoicePageSchema = new Schema(
  {
    pageNumber: { type: Number, required: true, min: 1 },
    items: { type: [invoiceItemSchema], default: [] },
  },
  { _id: false }
);

export const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },
    invoiceType: { type: String, enum: ["aed", "usd"], default: "aed", index: true },
    currency: { type: String, enum: SUPPORTED_CURRENCY_VALUES, default: DEFAULT_CURRENCY },
    projectId: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    poId: { type: Types.ObjectId, ref: "PurchaseOrder", index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    documentInfo: { type: documentInfoSchema, required: true },
    clientSnapshot: { type: clientSnapshotSchema, required: true },
    companySnapshot: { type: companySnapshotSchema, required: true },
    pages: { type: [invoicePageSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    totalAmountBase: decimalField,
    totalsCache: {
      totalReceivedBase: decimalField,
      totalFeesBase: decimalField,
      totalIntendedBase: decimalField,
      overpaidAmountBase: decimalField,
      lastCalculatedAt: { type: Date },
      version: { type: Number, default: 0 }
    },
    branding: {
      customLogoUrl: { type: String, default: "" },
      customSignatureUrl: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    lifecycleStatus: {
      type: String,
      enum: ["DRAFT_HIDDEN", "DRAFT_VISIBLE", "FINALIZED", "ARCHIVED", "CANCELLED"],
      default: "DRAFT_HIDDEN",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID", "REFUNDED"],
      default: "UNPAID",
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    extras: { type: invoiceExtrasSchema, default: () => ({}) },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
  },
  schemaOptions
);

invoiceSchema.pre("save", async function (this: any) {
  // If isNew, initialize dual-status based on _hiddenUntilSaved or legacy status
  if (this.isNew) {
    if (this.extras?._hiddenUntilSaved === true) {
      this.lifecycleStatus = "DRAFT_HIDDEN";
      this.status = "DRAFT";
    } else if (this.status === "DRAFT") {
      this.lifecycleStatus = "DRAFT_VISIBLE";
      this.paymentStatus = "UNPAID";
    }
  }

  // If extras._hiddenUntilSaved is explicitly set to false on a draft hidden invoice, transition it to visible draft
  if (this.extras?._hiddenUntilSaved === false && this.lifecycleStatus === "DRAFT_HIDDEN") {
    this.lifecycleStatus = "DRAFT_VISIBLE";
  }

  // If status is updated but lifecycle/payment are not, sync them
  if (this.isModified("status")) {
    const s = this.status;
    if (s === "DRAFT") {
      if (this.extras?._hiddenUntilSaved === true || this.lifecycleStatus === "DRAFT_HIDDEN") {
        this.lifecycleStatus = "DRAFT_HIDDEN";
      } else {
        this.lifecycleStatus = "DRAFT_VISIBLE";
      }
      this.paymentStatus = "UNPAID";
    } else if (s === "SENT") {
      this.lifecycleStatus = "FINALIZED";
      this.paymentStatus = "UNPAID";
    } else if (s === "PARTIAL") {
      this.lifecycleStatus = "FINALIZED";
      this.paymentStatus = "PARTIAL";
    } else if (s === "PAID") {
      this.lifecycleStatus = "FINALIZED";
      this.paymentStatus = "PAID";
    } else if (s === "OVERDUE") {
      this.lifecycleStatus = "FINALIZED";
      this.paymentStatus = "UNPAID";
    } else if (s === "CANCELLED") {
      this.lifecycleStatus = "CANCELLED";
      this.paymentStatus = "UNPAID";
    }
  } else if (this.isModified("lifecycleStatus") || this.isModified("paymentStatus")) {
    // If lifecycleStatus/paymentStatus are updated, sync legacy status
    const lc = this.lifecycleStatus;
    const pm = this.paymentStatus;
    if (lc === "CANCELLED") {
      this.status = "CANCELLED";
    } else if (lc === "DRAFT_HIDDEN") {
      this.status = "DRAFT";
    } else if (lc === "DRAFT_VISIBLE") {
      this.status = "DRAFT";
    } else if (lc === "FINALIZED") {
      if (pm === "PAID") this.status = "PAID";
      else if (pm === "PARTIAL") this.status = "PARTIAL";
      else this.status = "SENT";
    }
  }

  // Sync _hiddenUntilSaved with lifecycleStatus
  if (this.lifecycleStatus === "DRAFT_HIDDEN") {
    this.extras._hiddenUntilSaved = true;
  } else {
    this.extras._hiddenUntilSaved = false;
  }
});

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, projectId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ companyId: 1, projectId: 1, lifecycleStatus: 1, paymentStatus: 1, dueDate: 1 });
invoiceSchema.index({ poId: 1, createdAt: -1 });
