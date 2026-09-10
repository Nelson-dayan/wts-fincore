import { model, models } from "mongoose";
import { paymentSchema } from "@/lib/db/schemas/payment.schema";

export const PaymentModel = models.Payment ?? model("Payment", paymentSchema);
