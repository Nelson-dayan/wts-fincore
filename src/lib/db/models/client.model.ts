import { model, models } from "mongoose";
import { clientSchema } from "@/lib/db/schemas/client.schema";

export const ClientModel = models.Client ?? model("Client", clientSchema);
