import mongoose, { model, models } from "mongoose";
import { quotationSchema } from "@/lib/db/schemas/quotation.schema";

if (process.env.NODE_ENV === "development" && models.Quotation) {
  delete mongoose.models.Quotation;
}

export const QuotationModel = models.Quotation ?? model("Quotation", quotationSchema);
