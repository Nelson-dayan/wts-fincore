import { model, models } from "mongoose";
import { quotationSchema } from "@/lib/db/schemas/quotation.schema";

export const QuotationModel = models.Quotation ?? model("Quotation", quotationSchema);
