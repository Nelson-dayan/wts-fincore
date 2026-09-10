import mongoose, { model, models } from "mongoose";
import { contactSchema } from "@/lib/db/schemas/contact.schema";

if (process.env.NODE_ENV === "development" && models.Contact) {
  delete mongoose.models.Contact;
}

export const ContactModel = models.Contact ?? model("Contact", contactSchema);
