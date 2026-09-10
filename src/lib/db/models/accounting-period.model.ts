import { model, models } from "mongoose";
import { accountingPeriodSchema } from "@/lib/db/schemas/accounting-period.schema";

export const AccountingPeriodModel =
  models.AccountingPeriod ?? model("AccountingPeriod", accountingPeriodSchema);
