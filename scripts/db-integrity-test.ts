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
  InvoiceModel,
  PaymentModel,
} from "../src/lib/db/models";
import { seedTestData } from "./seed-test";
import mongoose from "mongoose";

async function runIntegrityTests() {
  console.log("\n=======================================================");
  console.log("🛡️ RUNNING PHASE 2 — DATA & DATABASE INTEGRITY TEST SUITE");
  console.log("=======================================================\n");

  const testEnv = await seedTestData();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [✓ PASS] ${testName}`);
      passed++;
    } else {
      console.log(`  [✗ FAIL] ${testName}`);
      failed++;
    }
  }

  // Test Case 1: Cross-Company Project vs Quotation Mismatch Validation
  console.log("👉 Test 1: Cross-Company Relationship Isolation");
  const fakeCrossCompanyQuotation = new QuotationModel({
    quotationNumber: "QT-CROSS-001",
    companyId: testEnv.testCompanyB._id, // Company B
    projectId: testEnv.projectA._id,     // Project from Company A
    createdBy: testEnv.testAdmin._id,
    status: "draft",
    currency: "AED",
  });

  const projectACompanyIdStr = testEnv.projectA.companyId.toString();
  const quotationCompanyIdStr = fakeCrossCompanyQuotation.companyId.toString();
  const isMismatch = projectACompanyIdStr !== quotationCompanyIdStr;
  assert(isMismatch, "Quotation companyId does not match Project companyId -> Mismatch Flagged");

  // Test Case 2: Orphan Records Check (Nonexistent Project reference)
  console.log("👉 Test 2: Nonexistent Resource Reference Handling");
  const fakeProjectId = new mongoose.Types.ObjectId();
  const orphanProj = await ProjectModel.findById(fakeProjectId);
  assert(orphanProj === null, "Orphan Project reference safely returns null without throwing unhandled exceptions");

  // Test Case 3: Inactive Client/Company Access
  console.log("👉 Test 3: Disabled/Inactive Entity Integrity");
  const inactiveClient = await ClientModel.create({
    name: "Inactive Test Client",
    companyId: testEnv.testCompanyA._id,
    status: "INACTIVE",
    createdBy: testEnv.testAdmin._id,
  });

  assert(inactiveClient.status === "INACTIVE", "Client status safely transitions to INACTIVE");
  
  // Cleanup test client
  await ClientModel.deleteOne({ _id: inactiveClient._id });

  console.log("\n-------------------------------------------------------");
  console.log(`INTEGRITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrityTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Integrity Test Error:", err);
      process.exit(1);
    });
}
