import { model, models } from "mongoose";
import { paymentAllocationSchema } from "@/lib/db/schemas/payment-allocation.schema";

export const PaymentAllocationModel = models.PaymentAllocation ?? model("PaymentAllocation", paymentAllocationSchema);
