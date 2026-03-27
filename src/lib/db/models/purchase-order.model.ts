import { model, models } from "mongoose";
import { purchaseOrderSchema } from "@/lib/db/schemas/purchase-order.schema";

export const PurchaseOrderModel =
  models.PurchaseOrder ?? model("PurchaseOrder", purchaseOrderSchema);
