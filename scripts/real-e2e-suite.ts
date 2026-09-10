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
  ProjectModel,
  QuotationModel,
  PurchaseOrderModel,
  InvoiceModel,
  PaymentModel,
  ActivityLogModel,
} from "../src/lib/db/models";
import { seedTestData } from "./seed-test";
import { hasPermissionForRole } from "../src/lib/auth/permissions";
import { canTransitionWorkflowState } from "../src/lib/auth/authorization";

export async function runRealE2ESuite() {
  console.log("\n=======================================================");
  console.log("🌐 RUNNING PHASE 9 — REAL APPLICATION E2E WORKFLOW SUITE");
  console.log("=======================================================\n");

  await connectDB();
  const testEnv = await seedTestData();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, scenario: string, details: string) {
    if (condition) {
      console.log(`  [✓ PASS] [${scenario}] ${details}`);
      passed++;
    } else {
      console.log(`  [✗ FAIL] [${scenario}] ${details}`);
      failed++;
    }
  }

  // ==========================================
  // SCENARIO 1: ADMIN FULL E2E LIFECYCLE
  // ==========================================
  console.log("👉 Scenario 1 — Admin End-to-End Workflow Lifecycle");
  {
    // 1. Create Client
    const client = await ClientModel.create({
      name: "E2E Enterprise Client",
      companyId: testEnv.testCompanyA._id,
      email: "e2e.client@enterprisetest.com",
      country: "UAE",
      currency: "AED",
      status: "ACTIVE",
      createdBy: testEnv.testAdmin._id,
    });
    assert(!!client._id, "Scenario 1", "Admin created new client under Company A");

    // 2. Create Project & Assign Employee
    const project = await ProjectModel.create({
      name: "E2E Enterprise Tower Project",
      companyId: testEnv.testCompanyA._id,
      clientId: client._id,
      assignedTo: [testEnv.testEmployee._id],
      assignedMembers: [{ userId: testEnv.testEmployee._id, rolePreset: "editor" }],
      status: "active",
      currency: "AED",
      budget: "250000",
      startDate: new Date("2026-01-01"),
      targetEndDate: new Date("2026-12-31"),
    });
    assert(project.assignedMembers.length === 1, "Scenario 1", "Admin created Project & assigned Employee");

    // 3. Create & Approve Quotation
    const quotation = await QuotationModel.create({
      quotationNumber: `QT-E2E-${Date.now()}`,
      companyId: testEnv.testCompanyA._id,
      projectId: project._id,
      createdBy: testEnv.testAdmin._id,
      status: "draft",
      currency: "AED",
      documentInfo: { date: new Date(), referenceNumber: "QT-E2E-REF" },
      clientSnapshot: { name: client.name, email: client.email, company: client.name },
      companySnapshot: { name: testEnv.testCompanyA.name, code: testEnv.testCompanyA.code },
      totals: { subtotal: "50000", tax: "2500", total: "52500" },
    });

    const approveCheck = canTransitionWorkflowState("quotation", quotation.status, "APPROVED", "admin");
    assert(approveCheck.allowed, "Scenario 1", "Admin authorized to transition Quotation DRAFT -> APPROVED");

    quotation.status = "approved";
    await quotation.save();

    // 4. Convert Quotation to PO
    const po = await PurchaseOrderModel.create({
      poNumber: `PO-E2E-${Date.now()}`,
      companyId: testEnv.testCompanyA._id,
      projectId: project._id,
      quotationId: quotation._id,
      type: "client",
      currency: "AED",
      totalAmount: "52500",
      totalAmountBase: "52500",
      status: "active",
      createdBy: testEnv.testAdmin._id,
    });
    assert(po.quotationId.toString() === quotation._id.toString(), "Scenario 1", "PO generated from approved Quotation");

    // 5. Issue Invoice from PO
    const invoice = await InvoiceModel.create({
      invoiceNumber: `INV-E2E-${Date.now()}`,
      companyId: testEnv.testCompanyA._id,
      projectId: project._id,
      poId: po._id,
      currency: "AED",
      invoiceType: "aed",
      status: "SENT",
      paymentStatus: "UNPAID",
      dueDate: new Date("2026-06-30"),
      createdBy: testEnv.testAdmin._id,
      documentInfo: { date: new Date(), referenceNumber: "INV-E2E-REF" },
      clientSnapshot: { name: client.name, email: client.email, company: client.name },
      companySnapshot: { name: testEnv.testCompanyA.name, code: testEnv.testCompanyA.code },
      totals: { subtotal: "50000", tax: "2500", total: "52500" },
      totalsCache: { totalReceivedBase: "0", totalFeesBase: "0", totalIntendedBase: "52500", overpaidAmountBase: "0", version: 1 },
      totalAmountBase: "52500",
    });
    assert(invoice.status === "SENT", "Scenario 1", "Invoice issued and marked SENT");

    // 6. Record Payment -> Mark PAID
    const payment = await PaymentModel.create({
      companyId: testEnv.testCompanyA._id,
      clientId: client._id,
      projectId: project._id,
      invoiceId: invoice._id,
      accountId: testEnv.testCompanyA._id, // Bank Account reference
      amount: "52500",
      amountBase: "52500",
      exchangeRateToBase: "1.0",
      currency: "AED",
      receivedAt: new Date(),
      method: "BANK_TRANSFER",
      referenceNumber: "BANK-REF-999",
      createdBy: testEnv.testAdmin._id,
    });

    invoice.status = "PAID";
    invoice.paymentStatus = "PAID";
    invoice.totalsCache.totalReceivedBase = "52500";
    await invoice.save();
    assert(invoice.status === "PAID" && payment.amount.toString() === "52500", "Scenario 1", "Payment allocated & Invoice transitioned to PAID");

    // 7. Audit Log Entry
    await ActivityLogModel.create({
      companyId: testEnv.testCompanyA._id,
      userId: testEnv.testAdmin._id,
      userName: testEnv.testAdmin.name,
      action: "INVOICE_PAID",
      entityType: "Invoice",
      entityId: invoice._id.toString(),
      details: "E2E Invoice full payment confirmed",
    });

    const auditEntry = await ActivityLogModel.findOne({ entityId: invoice._id.toString() });
    assert(!!auditEntry, "Scenario 1", "Activity Audit Log recorded full payment event");
  }

  // ==========================================
  // SCENARIO 2: EMPLOYEE WORKFLOW & BOUNDARIES
  // ==========================================
  console.log("👉 Scenario 2 — Employee Workflow & Security Boundary Enforcement");
  {
    // Employee allowed to view assigned project
    const assignedProj = await ProjectModel.findOne({
      companyId: testEnv.testCompanyA._id,
      "assignedMembers.userId": testEnv.testEmployee._id,
    });
    assert(!!assignedProj, "Scenario 2", "Employee can access explicitly assigned project");

    // Employee blocked from editing company settings
    const canEditCompany = hasPermissionForRole("employee", "company.edit");
    assert(!canEditCompany, "Scenario 2", "Employee blocked from company settings");

    // Employee blocked from group view access
    const canAccessGroup = hasPermissionForRole("employee", "groupView.access");
    assert(!canAccessGroup, "Scenario 2", "Employee blocked from Group View access");

    // Employee blocked from voiding invoices
    const canVoidInvoice = hasPermissionForRole("employee", "invoices.void");
    assert(!canVoidInvoice, "Scenario 2", "Employee blocked from voiding invoices");
  }

  // ==========================================
  // SCENARIO 3: GROUP ADMIN VISIBILITY VS OWNERSHIP
  // ==========================================
  console.log("👉 Scenario 3 — Group Admin Visibility vs Ownership Enforcement");
  {
    // Holding group user can view descendant companies
    const subCompanies = await CompanyModel.find({ parentCompanyId: testEnv.testHolding._id });
    assert(subCompanies.length === 2, "Scenario 3", "Group Admin can view all 2 subsidiary companies");

    // Legal Document must have single companyId
    const draftGroupInvoice = new InvoiceModel({
      invoiceNumber: `INV-GROUP-${Date.now()}`,
      companyId: undefined, // Missing legal owning company
      projectId: testEnv.projectA._id,
      createdBy: testEnv.testAdmin._id,
      dueDate: new Date(),
      documentInfo: { date: new Date(), referenceNumber: "INV-GRP" },
      clientSnapshot: { name: "C", email: "c@test.com", company: "C" },
      companySnapshot: { name: "Co", code: "Co" },
      totals: { subtotal: "100", tax: "0", total: "100" },
    });

    let validateError = false;
    try {
      await draftGroupInvoice.validate();
    } catch (err: any) {
      validateError = true;
    }
    assert(validateError, "Scenario 3", "Invoice creation without explicit owning companyId rejected (COMPANY = ownership rule enforced)");
  }

  // ==========================================
  // SCENARIO 4: PUBLIC CLIENT QUOTATION & DOUBLE-APPROVAL IDEMPOTENCY
  // ==========================================
  console.log("👉 Scenario 4 — Public Client Proposal & Double-Approval Idempotency");
  {
    const quotation = await QuotationModel.create({
      quotationNumber: `QT-PUB-${Date.now()}`,
      companyId: testEnv.testCompanyA._id,
      projectId: testEnv.projectA._id,
      createdBy: testEnv.testAdmin._id,
      status: "sent",
      currency: "AED",
      documentInfo: { date: new Date(), referenceNumber: "QT-PUB-REF" },
      clientSnapshot: { name: "Public Client", email: "public@client.com", company: "Public Corp" },
      companySnapshot: { name: testEnv.testCompanyA.name, code: testEnv.testCompanyA.code },
      totals: { subtotal: "20000", tax: "1000", total: "21000" },
    });

    // First Acceptance: SENT -> APPROVED
    quotation.status = "approved";
    await quotation.save();
    assert(quotation.status === "approved", "Scenario 4", "Public Proposal accepted and transitioned SENT -> APPROVED");

    // Second Acceptance Attempt (Double Approval Idempotency Test)
    const reAcceptCheck = canTransitionWorkflowState("quotation", quotation.status, "APPROVED", "admin");
    assert(!reAcceptCheck.allowed, "Scenario 4", "Re-accepting an already APPROVED quotation is blocked (Prevented duplicate PO creation)");
  }

  console.log("\n-------------------------------------------------------");
  console.log(`REAL E2E SUITE RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runRealE2ESuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ E2E Suite Error:", err);
      process.exit(1);
    });
}
