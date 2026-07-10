import { model, models } from "mongoose";
import { idempotencySchema } from "@/lib/db/schemas/idempotency.schema";

export const IdempotencyModel = models.Idempotency ?? model("Idempotency", idempotencySchema);
