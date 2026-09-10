import { model, models } from "mongoose";
import { transferSchema } from "@/lib/db/schemas/transfer.schema";

export const TransferModel = models.Transfer ?? model("Transfer", transferSchema);
