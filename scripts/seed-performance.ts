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
  ClientModel,
  ProjectModel,
  QuotationModel,
  PurchaseOrderModel,
  InvoiceModel,
  PaymentModel,
  ExpenseModel,
  ActivityLogModel,
  UserModel,
} from "../src/lib/db/models";

export async function seedPerformanceData(datasetSize: "small" | "medium" = "small") {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_TEST !== "true") {
    throw new Error("❌ CRITICAL SAFETY ABORT: Cannot run performance seed in PRODUCTION environment!");
  }

  console.log(`🚀 Seeding Synthetic Performance Dataset (${datasetSize.toUpperCase()})...`);
  await connectDB();

  const countMultiplier = datasetSize === "medium" ? 5 : 1;

  // 1. Synthetic Performance Company
  const perfHolding = await CompanyModel.create({
    name: `PERF Holding Group (${datasetSize})`,
    code: `PERF-HOLD-${Date.now()}`,
    kind: "holding",
    taxId: "PERF-TAX-100",
    baseCurrency: "USD",
    isActive: true,
  });

  const perfCompany = await CompanyModel.create({
    name: `PERF Operating Entity (${datasetSize})`,
    code: `PERF-OP-${Date.now()}`,
    kind: "operating",
    parentCompanyId: perfHolding._id,
    taxId: "PERF-TAX-101",
    baseCurrency: "AED",
    isActive: true,
  });

  const perfUser = await UserModel.create({
    email: `perf.admin.${Date.now()}@fincore-perf.com`,
    password: "PerfPassword123!",
    name: "Perf Admin",
    role: "admin",
    defaultCompanyId: perfCompany._id,
    isActive: true,
  });

  // 2. Clients
  const clientCount = 10 * countMultiplier;
  const clients = [];
  for (let i = 1; i <= clientCount; i++) {
    clients.push({
      name: `PERF Client #${i}`,
      companyId: perfCompany._id,
      email: `perf.client${i}@test.com`,
      country: "UAE",
      currency: "AED",
      status: "ACTIVE",
      createdBy: perfUser._id,
    });
  }
  const createdClients = await ClientModel.insertMany(clients);

  // 3. Projects
  const projectCount = 25 * countMultiplier;
  const projects = [];
  for (let i = 1; i <= projectCount; i++) {
    const parentClient = createdClients[i % createdClients.length];
    projects.push({
      name: `PERF Project #${i}`,
      companyId: perfCompany._id,
      clientId: parentClient._id,
      status: i % 4 === 0 ? "completed" : "active",
      currency: "AED",
      budget: String(50000 + i * 1000),
      startDate: new Date("2026-01-01"),
      targetEndDate: new Date("2026-12-31"),
    });
  }
  const createdProjects = await ProjectModel.insertMany(projects);

  // 4. Quotations, POs, Invoices, Expenses
  const itemLimit = 100 * countMultiplier;
  const quotations = [];
  const pos = [];
  const invoices = [];
  const expenses = [];
  const activities = [];

  // Insert quotations first to obtain valid ObjectIds for POs
  for (let i = 1; i <= itemLimit; i++) {
    const proj = createdProjects[i % createdProjects.length];
    quotations.push({
      quotationNumber: `QT-PERF-${i}`,
      companyId: perfCompany._id,
      projectId: proj._id,
      createdBy: perfUser._id,
      status: "approved",
      currency: "AED",
      documentInfo: {
        date: new Date(),
        referenceNumber: `QT-PERF-${i}`,
      },
      clientSnapshot: {
        name: "PERF Client",
        company: "PERF Client",
        address: "Dubai, UAE",
        phone: "+9714000000",
        email: "perf@client.com",
      },
      companySnapshot: {
        name: "PERF Operating Entity",
        code: "PERF-OP",
        address: "Dubai, UAE",
        phone: "+9714000000",
        email: "perf@company.com",
      },
      totals: { subtotal: "10000", tax: "500", total: "10500" },
    });
  }
  const createdQuotations = await QuotationModel.insertMany(quotations);

  for (let i = 0; i < itemLimit; i++) {
    const proj = createdProjects[i % createdProjects.length];
    const q = createdQuotations[i];

    pos.push({
      poNumber: `PO-PERF-${i + 1}`,
      companyId: perfCompany._id,
      projectId: proj._id,
      quotationId: q._id,
      type: "client",
      currency: "AED",
      totalAmount: "10500",
      totalAmountBase: "10500",
      status: "active",
      createdBy: perfUser._id,
    });
  }
  const createdPOs = await PurchaseOrderModel.insertMany(pos);

  for (let i = 0; i < itemLimit; i++) {
    const proj = createdProjects[i % createdProjects.length];
    const po = createdPOs[i];

    invoices.push({
      invoiceNumber: `INV-PERF-${i + 1}`,
      companyId: perfCompany._id,
      projectId: proj._id,
      poId: po._id,
      currency: "AED",
      invoiceType: "aed",
      status: "SENT",
      paymentStatus: "UNPAID",
      dueDate: new Date("2026-06-30"),
      createdBy: perfUser._id,
      documentInfo: {
        date: new Date(),
        referenceNumber: `INV-PERF-${i + 1}`,
      },
      clientSnapshot: {
        name: "PERF Client",
        company: "PERF Client",
        address: "Dubai, UAE",
        phone: "+9714000000",
        email: "perf@client.com",
      },
      companySnapshot: {
        name: "PERF Operating Entity",
        code: "PERF-OP",
        address: "Dubai, UAE",
        phone: "+9714000000",
        email: "perf@company.com",
      },
      totals: { subtotal: "10000", tax: "500", total: "10500" },
      totalsCache: { totalReceivedBase: "0", totalFeesBase: "0", totalIntendedBase: "10500", overpaidAmountBase: "0", version: 1 },
      totalAmountBase: "10500",
    });

    expenses.push({
      title: `PERF Expense #${i + 1}`,
      companyId: perfCompany._id,
      projectId: proj._id,
      category: "TOOLS",
      currency: "AED",
      amount: "1500",
      baseAmount: "1500",
      exchangeRate: "1",
      createdBy: perfUser._id,
    });

    activities.push({
      companyId: perfCompany._id,
      userId: perfUser._id,
      userName: perfUser.name,
      action: "PERF_RECORD_CREATED",
      entityType: "SyntheticTest",
      entityId: perfCompany._id.toString(),
      details: `Created synthetic benchmark record #${i + 1}`,
    });
  }

  await Promise.all([
    InvoiceModel.insertMany(invoices),
    ExpenseModel.insertMany(expenses),
    ActivityLogModel.insertMany(activities),
  ]);

  console.log(`✅ Performance Dataset Seeding Complete: ${createdProjects.length} projects, ${itemLimit} invoices/expenses.`);
  return { perfCompany, perfHolding };
}

if (require.main === module) {
  const size = (process.argv[2] as "small" | "medium") || "small";
  seedPerformanceData(size)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Performance Seeding Error:", err);
      process.exit(1);
    });
}
