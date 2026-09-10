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
  AccountModel,
  ExpenseModel,
  ActivityLogModel,
} from "../src/lib/db/models";
import bcrypt from "bcryptjs";
import { ProjectContactRole } from "../src/types/contact";

async function main() {
  console.log("🌱 Starting WTS-FinCore Database Seeding...");
  await connectDB();

  // Clear existing sample data
  console.log("🧹 Cleaning up existing records...");
  await Promise.all([
    CompanyModel.deleteMany({}),
    UserModel.deleteMany({}),
    ClientModel.deleteMany({}),
    ContactModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    ProjectContactAssignmentModel.deleteMany({}),
    QuotationModel.deleteMany({}),
    PurchaseOrderModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    AccountModel.deleteMany({}),
    ExpenseModel.deleteMany({}),
    ActivityLogModel.deleteMany({}),
  ]);

  // 1. Create Companies
  console.log("🏢 Seeding Companies...");
  const holdingCompany = await CompanyModel.create({
    name: "FinCore Global Holdings",
    code: "HOLD",
    kind: "holding",
    taxId: "TAX-99887766",
    baseCurrency: "USD",
    isActive: true,
    isPrimary: false,
    branding: {
      invoicePrefix: "HOLD",
      quotationPrefix: "HOLD",
      poPrefix: "HOLD",
    },
  });

  const primaryCompany = await CompanyModel.create({
    name: "Sec-DocuTrade Middle East",
    code: "SDT-DXB",
    kind: "operating",
    parentCompanyId: holdingCompany._id,
    taxId: "100234567800003",
    baseCurrency: "AED",
    supportedCurrencies: ["AED", "USD", "EUR", "GBP", "SAR", "INR", "AUD"],
    isActive: true,
    isPrimary: true,
    branding: {
      logoText: "Sec-DocuTrade Dubai",
      invoicePrefix: "INV-DXB",
      quotationPrefix: "QT-DXB",
      poPrefix: "PO-DXB",
      invoiceFooter: "Thank you for doing business with Sec-DocuTrade Middle East FZ-LLC.",
      bankDetailsText: "Emirates NBD | IBAN: AE030260000001234567891 | BIC: EBILAE2DXXX",
    },
  });

  const sydneyBranch = await CompanyModel.create({
    name: "FinCore Australia Branch",
    code: "FNC-SYD",
    kind: "branch",
    parentCompanyId: holdingCompany._id,
    taxId: "ABN-55123456789",
    baseCurrency: "AUD",
    supportedCurrencies: ["AUD", "USD", "AED"],
    isActive: true,
    isPrimary: false,
    branding: {
      logoText: "FinCore Australia",
      invoicePrefix: "INV-SYD",
      quotationPrefix: "QT-SYD",
      poPrefix: "PO-SYD",
    },
  });

  // 2. Create Users
  console.log("👤 Seeding Users...");
  const passwordHash = await bcrypt.hash("Password123!", 10);
  
  const adminUser = await UserModel.create({
    email: "admin@fincore.com",
    password: passwordHash,
    name: "Alex Vance (Admin)",
    role: "admin",
    defaultCompanyId: primaryCompany._id,
    isActive: true,
  });

  const employeeUser = await UserModel.create({
    email: "john.doe@fincore.com",
    password: passwordHash,
    name: "John Doe (Project Lead)",
    role: "employee",
    defaultCompanyId: primaryCompany._id,
    isActive: true,
  });

  // 3. Create Accounts (Chart of Accounts)
  console.log("🏦 Seeding Financial Accounts...");
  const mainAccount = await AccountModel.create({
    name: "ENBD Main Operating Account",
    type: "BANK",
    companyId: primaryCompany._id,
    currency: "AED",
    accountNumberMasked: "**** 7891",
    provider: "Emirates NBD",
    openingBalance: "450000",
    currentBalance: "450000",
    isActive: true,
    createdBy: adminUser._id,
  });

  const usdAccount = await AccountModel.create({
    name: "HSBC Corporate USD Account",
    type: "BANK",
    companyId: primaryCompany._id,
    currency: "USD",
    accountNumberMasked: "**** 8911",
    provider: "HSBC Middle East",
    openingBalance: "120000",
    currentBalance: "120000",
    isActive: true,
    createdBy: adminUser._id,
  });

  const audAccount = await AccountModel.create({
    name: "ANZ Sydney AUD Operating",
    type: "BANK",
    companyId: sydneyBranch._id,
    currency: "AUD",
    accountNumberMasked: "**** 3322",
    provider: "ANZ Banking Group",
    openingBalance: "95000",
    currentBalance: "95000",
    isActive: true,
    createdBy: adminUser._id,
  });

  // 4. Create Clients & Contacts
  console.log("👥 Seeding Clients & Multi-Role Contacts...");
  const clientApex = await ClientModel.create({
    name: "Apex Technologies FZ-LLC",
    companyId: primaryCompany._id,
    email: "procurement@apextech.com",
    phone: "+971 4 390 1122",
    address: "Building 4, Dubai Internet City, Dubai, UAE",
    country: "UAE",
    currency: "AED",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  const clientGlobalTrade = await ClientModel.create({
    name: "Global Trade Systems International",
    companyId: primaryCompany._id,
    email: "contact@globaltradesys.com",
    phone: "+1 212 555 0199",
    address: "350 Fifth Avenue, New York, NY 10118, USA",
    country: "USA",
    currency: "USD",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  const clientHorizon = await ClientModel.create({
    name: "Horizon Energy Resources",
    companyId: sydneyBranch._id,
    email: "accounts@horizonenergy.com.au",
    phone: "+61 2 8200 9900",
    address: "Level 25, 100 Barangaroo Avenue, Sydney NSW 2000, Australia",
    country: "Australia",
    currency: "AUD",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  // Contacts
  const rahulSharma = await ContactModel.create({
    companyId: primaryCompany._id,
    clientId: clientApex._id,
    firstName: "Rahul",
    lastName: "Sharma",
    email: "rahul.sharma@apextech.com",
    phone: "+971 50 123 4567",
    jobTitle: "Chief Technology Officer",
    department: "Engineering",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  const sarahJenkins = await ContactModel.create({
    companyId: primaryCompany._id,
    clientId: clientApex._id,
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.j@apextech.com",
    phone: "+971 52 987 6543",
    jobTitle: "Head of Procurement & Finance",
    department: "Finance",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  const michaelChang = await ContactModel.create({
    companyId: sydneyBranch._id,
    clientId: clientHorizon._id,
    firstName: "Michael",
    lastName: "Chang",
    email: "m.chang@horizonenergy.com.au",
    phone: "+61 411 222 333",
    jobTitle: "VP Operations",
    department: "Operations",
    status: "ACTIVE",
    createdBy: adminUser._id,
  });

  // 5. Create Projects & Multi-Role Contact Assignments
  console.log("📊 Seeding Projects & Role Mapping...");
  const projectTradePortal = await ProjectModel.create({
    name: "Apex Enterprise Trade Portal V2",
    companyId: primaryCompany._id,
    clientId: clientApex._id,
    status: "active",
    currency: "AED",
    budget: "250000",
    startDate: new Date("2026-01-15"),
    targetEndDate: new Date("2026-08-30"),
    description: "Custom trade document automation platform with automated customs clearance workflow.",
  });

  const projectGlobalAPI = await ProjectModel.create({
    name: "Global Trade Core API Gateway",
    companyId: primaryCompany._id,
    clientId: clientGlobalTrade._id,
    status: "active",
    currency: "USD",
    budget: "95000",
    startDate: new Date("2026-02-01"),
    targetEndDate: new Date("2026-10-15"),
    description: "Multi-currency clearing gateway integration for global trade partners.",
  });

  const projectSydneySolar = await ProjectModel.create({
    name: "Horizon Solar Logistics Platform",
    companyId: sydneyBranch._id,
    clientId: clientHorizon._id,
    status: "completed",
    currency: "AUD",
    budget: "180000",
    startDate: new Date("2025-10-01"),
    targetEndDate: new Date("2026-04-15"),
    description: "Telemetry and logistics automation platform for Australian renewable energy infrastructure.",
  });

  // Assign Multi-Roles to Contacts for Project Trade Portal:
  // Assign Multi-Roles to Contacts for Project Trade Portal:
  // Rahul Sharma -> TECHNICAL and APPROVER
  await ProjectContactAssignmentModel.create([
    {
      projectId: projectTradePortal._id,
      contactId: rahulSharma._id,
      role: ProjectContactRole.TECHNICAL,
      createdBy: adminUser._id,
    },
    {
      projectId: projectTradePortal._id,
      contactId: rahulSharma._id,
      role: ProjectContactRole.APPROVER,
      createdBy: adminUser._id,
    },
    // Sarah Jenkins -> BILLING and FINANCE
    {
      projectId: projectTradePortal._id,
      contactId: sarahJenkins._id,
      role: ProjectContactRole.BILLING,
      createdBy: adminUser._id,
    },
    {
      projectId: projectTradePortal._id,
      contactId: sarahJenkins._id,
      role: ProjectContactRole.FINANCE,
      createdBy: adminUser._id,
    },
    // Michael Chang -> PROJECT_MANAGER and OPERATIONS
    {
      projectId: projectSydneySolar._id,
      contactId: michaelChang._id,
      role: ProjectContactRole.PROJECT_MANAGER,
      createdBy: adminUser._id,
    },
    {
      projectId: projectSydneySolar._id,
      contactId: michaelChang._id,
      role: ProjectContactRole.OPERATIONS,
      createdBy: adminUser._id,
    },
  ]);

  // 6. Create Quotations
  console.log("📜 Seeding Quotations & POs...");
  const quotationApex = await QuotationModel.create({
    quotationNumber: "QT-DXB-2026-001",
    companyId: primaryCompany._id,
    projectId: projectTradePortal._id,
    createdBy: adminUser._id,
    status: "approved",
    currency: "AED",
    documentInfo: {
      docNumber: "QT-DXB-2026-001",
      date: new Date("2026-01-20"),
    },
    clientSnapshot: {
      name: clientApex.name,
      address: clientApex.address,
    },
    companySnapshot: {
      name: primaryCompany.name,
      address: "Dubai Internet City, Building 4",
    },
    pages: [
      {
        pageNumber: 1,
        items: [
          {
            number: 1,
            name: "Phase 1 - Architecture & Database Schema Design",
            description: "Core multi-company database model setup",
            quantity: 1,
            price: "50000",
          },
          {
            number: 2,
            name: "Phase 2 - Customs Integration API & Document Exporter",
            description: "PDF/DOCX exporter engine",
            quantity: 1,
            price: "120000",
          },
        ],
      },
    ],
    totals: {
      subtotal: "170000",
      tax: "8500",
      total: "178500",
    },
  });

  // 7. Create Purchase Orders
  const poCloudServer = await PurchaseOrderModel.create({
    poNumber: "PO-DXB-2026-001",
    companyId: primaryCompany._id,
    projectId: projectTradePortal._id,
    quotationId: quotationApex._id,
    type: "client",
    currency: "AED",
    totalAmount: "31500",
    totalAmountBase: "31500",
    status: "active",
    createdBy: adminUser._id,
  });

  // 8. Create Invoices & Payments
  console.log("💳 Seeding Invoices & Payments...");
  const invoice1 = await InvoiceModel.create({
    invoiceNumber: "INV-DXB-2026-001",
    companyId: primaryCompany._id,
    projectId: projectTradePortal._id,
    poId: poCloudServer._id,
    currency: "AED",
    invoiceType: "aed",
    status: "PARTIAL",
    paymentStatus: "PARTIAL",
    dueDate: new Date("2026-03-15"),
    createdBy: adminUser._id,
    documentInfo: {
      docNumber: "INV-DXB-2026-001",
      date: new Date("2026-02-15"),
    },
    clientSnapshot: {
      name: clientApex.name,
      address: clientApex.address,
    },
    companySnapshot: {
      name: primaryCompany.name,
      address: "Dubai Internet City, Building 4",
    },
    pages: [
      {
        pageNumber: 1,
        items: [
          {
            number: 1,
            name: "Phase 1 Milestone Invoice",
            description: "Architecture & Schema setup complete",
            quantity: 1,
            price: "50000",
          },
        ],
      },
    ],
    totals: {
      subtotal: "50000",
      tax: "2500",
      total: "52500",
    },
    totalsCache: {
      totalReceivedBase: "30000",
      totalFeesBase: "0",
      totalIntendedBase: "52500",
      overpaidAmountBase: "0",
      version: 1,
    },
    totalAmountBase: "52500",
  });

  await PaymentModel.create({
    companyId: primaryCompany._id,
    projectId: projectTradePortal._id,
    clientId: clientApex._id,
    invoiceId: invoice1._id,
    accountId: mainAccount._id,
    direction: "INCOMING",
    type: "PAYMENT",
    status: "COMPLETED",
    method: "BANK_TRANSFER",
    referenceNumber: "TRX-ENBD-998811",
    currency: "AED",
    amount: "30000",
    exchangeRateToBase: "1",
    amountBase: "30000",
    note: "Advance partial payment for Phase 1 setup.",
    createdBy: adminUser._id,
  });

  // 9. Create Expenses
  console.log("🧾 Seeding Expenses...");
  await ExpenseModel.create([
    {
      title: "Software Tool Licenses (GitHub & Figma)",
      companyId: primaryCompany._id,
      projectId: projectTradePortal._id,
      category: "TOOLS",
      currency: "AED",
      amount: "4500",
      baseAmount: "4500",
      exchangeRate: "1",
      note: "Dev team software tool licenses.",
      createdBy: employeeUser._id,
    },
    {
      title: "Qantas Flight & Site Visit Lodging",
      companyId: sydneyBranch._id,
      projectId: projectSydneySolar._id,
      category: "INFRA",
      currency: "AUD",
      amount: "2800",
      baseAmount: "2800",
      exchangeRate: "1",
      note: "Site installation verification flight & lodging.",
      createdBy: adminUser._id,
    },
  ]);

  // 10. Audit Log
  await ActivityLogModel.create({
    companyId: primaryCompany._id,
    userId: adminUser._id,
    userName: adminUser.name,
    action: "SYSTEM_SEEDED",
    entityType: "System",
    entityId: primaryCompany._id.toString(),
    details: "Demo database seeded successfully with companies, clients, contacts, multi-roles, projects, quotations, POs, invoices, and payments.",
  });

  console.log("✅ WTS-FinCore Seeding Completed Successfully!");
  console.log("--------------------------------------------------");
  console.log("🔑 Demo Credentials:");
  console.log("   Admin Email:    admin@fincore.com");
  console.log("   Employee Email: john.doe@fincore.com");
  console.log("   Password:       Password123!");
  console.log("--------------------------------------------------");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding Error:", err);
  process.exit(1);
});
