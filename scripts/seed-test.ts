import fs from "fs";
import path from "path";

// Load .env file automatically
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
  UserModel,
  CompanyModel,
  ClientModel,
  ContactModel,
  ProjectModel,
  ProjectContactAssignmentModel,
  QuotationModel,
  PurchaseOrderModel,
  InvoiceModel,
  PaymentModel,
  ExpenseModel,
  ActivityLogModel,
} from "../src/lib/db/models";
import bcrypt from "bcryptjs";

export async function seedTestData() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_TEST !== "true") {
    throw new Error("❌ CRITICAL SAFETY ABORT: Cannot run test seed script in PRODUCTION environment!");
  }

  console.log("🧪 Seeding Dedicated QA Test Dataset (Isolated & Non-Destructive)...");
  await connectDB();

  // Clear existing QA test records specifically (matching code/email prefix 'TEST-')
  console.log("🧹 Cleaning up old TEST- dataset records...");
  const testCompanies = await CompanyModel.find({ code: /^TEST-/ });
  const testCompanyIds = testCompanies.map((c) => c._id);

  if (testCompanyIds.length > 0) {
    await Promise.all([
      CompanyModel.deleteMany({ _id: { $in: testCompanyIds } }),
      UserModel.deleteMany({ email: /^test\./ }),
      ClientModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      ContactModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      ProjectModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      QuotationModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      PurchaseOrderModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      InvoiceModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      PaymentModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      ExpenseModel.deleteMany({ companyId: { $in: testCompanyIds } }),
      ActivityLogModel.deleteMany({ companyId: { $in: testCompanyIds } }),
    ]);
  }

  // 1. Create Test Holding & Operating Companies
  const testHolding = await CompanyModel.create({
    name: "TEST Holding Corp",
    code: "TEST-HOLD",
    kind: "holding",
    taxId: "TEST-TAX-001",
    baseCurrency: "USD",
    isActive: true,
    isPrimary: false,
    branding: {
      invoicePrefix: "INV-THOLD",
      quotationPrefix: "QT-THOLD",
      poPrefix: "PO-THOLD",
    },
  });

  const testCompanyA = await CompanyModel.create({
    name: "TEST Entity Alpha",
    code: "TEST-ALPHA",
    kind: "operating",
    parentCompanyId: testHolding._id,
    taxId: "TEST-TAX-002",
    baseCurrency: "AED",
    supportedCurrencies: ["AED", "USD"],
    isActive: true,
    isPrimary: false,
    branding: {
      invoicePrefix: "INV-TALPHA",
      quotationPrefix: "QT-TALPHA",
      poPrefix: "PO-TALPHA",
    },
  });

  const testCompanyB = await CompanyModel.create({
    name: "TEST Entity Beta",
    code: "TEST-BETA",
    kind: "operating",
    parentCompanyId: testHolding._id,
    taxId: "TEST-TAX-003",
    baseCurrency: "USD",
    supportedCurrencies: ["USD"],
    isActive: true,
    isPrimary: false,
    branding: {
      invoicePrefix: "INV-TBETA",
      quotationPrefix: "QT-TBETA",
      poPrefix: "PO-TBETA",
    },
  });

  // 2. Create Test Users
  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const testAdmin = await UserModel.create({
    email: "test.admin@fincore-test.com",
    password: passwordHash,
    name: "Test Admin",
    role: "admin",
    defaultCompanyId: testCompanyA._id,
    isActive: true,
  });

  const testEmployee = await UserModel.create({
    email: "test.employee@fincore-test.com",
    password: passwordHash,
    name: "Test Employee",
    role: "employee",
    defaultCompanyId: testCompanyA._id,
    isActive: true,
  });

  // 3. Create Test Clients & Projects
  const clientA = await ClientModel.create({
    name: "Test Client Alpha",
    companyId: testCompanyA._id,
    email: "alpha@clienttest.com",
    country: "UAE",
    currency: "AED",
    status: "ACTIVE",
    createdBy: testAdmin._id,
  });

  const clientB = await ClientModel.create({
    name: "Test Client Beta",
    companyId: testCompanyB._id,
    email: "beta@clienttest.com",
    country: "USA",
    currency: "USD",
    status: "ACTIVE",
    createdBy: testAdmin._id,
  });

  const projectA = await ProjectModel.create({
    name: "Test Project Alpha-1",
    companyId: testCompanyA._id,
    clientId: clientA._id,
    status: "active",
    currency: "AED",
    budget: "100000",
    startDate: new Date("2026-01-01"),
    targetEndDate: new Date("2026-12-31"),
  });

  const projectB = await ProjectModel.create({
    name: "Test Project Beta-1",
    companyId: testCompanyB._id,
    clientId: clientB._id,
    status: "active",
    currency: "USD",
    budget: "50000",
    startDate: new Date("2026-01-01"),
    targetEndDate: new Date("2026-12-31"),
  });

  console.log("✅ Dedicated QA Test Dataset Created Successfully!");
  return {
    testHolding,
    testCompanyA,
    testCompanyB,
    testAdmin,
    testEmployee,
    clientA,
    clientB,
    projectA,
    projectB,
  };
}

if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed Test Data Error:", err);
      process.exit(1);
    });
}
