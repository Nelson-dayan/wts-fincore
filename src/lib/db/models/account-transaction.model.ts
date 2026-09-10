import { model, models } from "mongoose";
import { accountTransactionSchema } from "@/lib/db/schemas/account-transaction.schema";

export const AccountTransactionModel = models.AccountTransaction ?? model("AccountTransaction", accountTransactionSchema);
