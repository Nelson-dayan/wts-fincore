import { model, models } from "mongoose";
import { accountSchema } from "@/lib/db/schemas/account.schema";

export const AccountModel = models.Account ?? model("Account", accountSchema);
