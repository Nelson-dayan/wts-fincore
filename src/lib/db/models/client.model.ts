import mongoose, { model, models } from "mongoose";
import { clientSchema } from "@/lib/db/schemas/client.schema";

if (process.env.NODE_ENV === "development" && models.Client) {
  delete mongoose.models.Client;
}

export const ClientModel = models.Client ?? model("Client", clientSchema);
