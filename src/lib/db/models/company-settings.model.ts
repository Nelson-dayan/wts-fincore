import { model, models } from "mongoose";
import { companySettingsSchema } from "@/lib/db/schemas/company-settings.schema";

export const CompanySettingsModel =
  models.CompanySettings ?? model("CompanySettings", companySettingsSchema);
