import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        const val = vals.join("=").trim();
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // Ignore env read error
}

import { connectDB } from "../src/lib/db/connect";
import {
  CompanyModel,
  UserModel,
  ClientModel,
  ProjectModel,
  QuotationModel,
  PurchaseOrderModel,
  InvoiceModel,
  PaymentModel,
  ExpenseModel,
  ActivityLogModel,
} from "../src/lib/db/models";

export async function cleanupPerformanceData() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_TEST !== "true") {
    throw new Error("❌ CRITICAL SAFETY ABORT: Cannot run performance cleanup in PRODUCTION environment!");
  }

  console.log("🧹 Cleaning up Synthetic Performance Data ONLY (Safe & Isolated)...");
  await connectDB();

  // Find performance test companies
  const perfCompanies = await CompanyModel.find({ code: /^PERF-/ });
  
  // Hard Safety Guard: Verify EVERY matched company code starts with PERF-
  const invalidTarget = perfCompanies.find(c => !c.code.startsWith("PERF-"));
  if (invalidTarget) {
    throw new Error(`CRITICAL SAFETY ABORT: Attempted to clean up non-PERF company: ${invalidTarget.code}`);
  }

  const perfCompanyIds = perfCompanies.map((c) => c._id);

  if (perfCompanyIds.length === 0) {
    console.log("ℹ️ No PERF- dataset companies found to clean up.");
    return;
  }

  await Promise.all([
    CompanyModel.deleteMany({ _id: { $in: perfCompanyIds } }),
    UserModel.deleteMany({ email: /^perf\./ }),
    ClientModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    ProjectModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    QuotationModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    PurchaseOrderModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    InvoiceModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    PaymentModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    ExpenseModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
    ActivityLogModel.deleteMany({ companyId: { $in: perfCompanyIds } }),
  ]);

  console.log(`✅ Safely removed ${perfCompanyIds.length} synthetic performance test entities without mutating main sample data.`);
}

if (require.main === module) {
  cleanupPerformanceData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Performance Cleanup Error:", err);
      process.exit(1);
    });
}
