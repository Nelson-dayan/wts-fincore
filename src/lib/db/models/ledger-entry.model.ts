import { model, models } from "mongoose";
import { ledgerEntrySchema } from "@/lib/db/schemas/ledger-entry.schema";

export const LedgerEntryModel =
  models.LedgerEntry ?? model("LedgerEntry", ledgerEntrySchema);
