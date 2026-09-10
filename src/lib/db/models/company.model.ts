import { model, models } from "mongoose";
import { companySchema } from "@/lib/db/schemas/company.schema";

export const CompanyModel = models.Company ?? model("Company", companySchema);
