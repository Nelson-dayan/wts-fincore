import { model, models } from "mongoose";
import { invoiceSchema } from "@/lib/db/schemas/invoice.schema";

export const InvoiceModel = models.Invoice ?? model("Invoice", invoiceSchema);
