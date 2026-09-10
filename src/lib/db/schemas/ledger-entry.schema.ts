import { Schema } from "mongoose";

/**
 * Standard double-entry financial ledger entry recording balanced debit/credit lines.
 * Under no circumstances can a saved entry be mutated (complete immutability).
 */
export const ledgerEntrySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    financialDate: { type: Date, required: true, index: true },
    referenceType: {
      type: String,
      enum: ["Invoice", "Payment", "Expense", "Transfer"],
      required: true,
      index: true,
    },
    referenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    description: { type: String, default: "" },

    // double-entry accounts mapping
    debitAccountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    creditAccountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },

    // Rounded monetary values
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    amountBase: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Enforce double-entry ledger entry immutability
ledgerEntrySchema.pre("save", async function (this: any) {
  if (!this.isNew) {
    throw new Error("Ledger entries are completely immutable and cannot be updated.");
  }
});
