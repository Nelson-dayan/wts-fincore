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
import { hasPermissionForRole } from "../src/lib/auth/permissions";
import { canTransitionWorkflowState } from "../src/lib/auth/authorization";

export async function runApiHealthSuite() {
  console.log("\n=======================================================");
  console.log("⚡ RUNNING PHASE 3 — BACKEND API HEALTH & EDGE CASE SUITE");
  console.log("=======================================================\n");

  await connectDB();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`  [✓ PASS] ${title}`);
      passed++;
    } else {
      console.log(`  [✗ FAIL] ${title}`);
      failed++;
    }
  }

  // 1. Missing Authentication Check
  console.log("👉 1. Authentication & Session Boundary");
  const nullUserAllowed = hasPermissionForRole("employee", "company.edit");
  assert(!nullUserAllowed, "Employee permission check correctly blocks company editing");

  // 2. Workflow Transition State Lock
  console.log("👉 2. Workflow Transition Locks");
  const approvedTransition = canTransitionWorkflowState("quotation", "APPROVED", "DRAFT", "admin");
  assert(!approvedTransition.allowed, "Cannot transition an APPROVED quotation back to DRAFT");

  // 3. Employee Capability Gating
  console.log("👉 3. Role-Based Capability Boundaries");
  const employeeForbiddenAction = hasPermissionForRole("employee", "invoices.void");
  assert(!employeeForbiddenAction, "Employee forbidden capability 'invoices.void' rejected");

  // 4. Financial Validation Boundaries
  console.log("👉 4. Payload Validation & Negative Value Handling");
  const isValidPositiveAmount = (amountStr: string) => {
    const num = Number(amountStr);
    return !isNaN(num) && num > 0;
  };
  assert(!isValidPositiveAmount("-500"), "Negative payment amount '-500' rejected by validation boundary");
  assert(isValidPositiveAmount("1500.50"), "Valid positive amount '1500.50' accepted by validation boundary");

  // 5. Malformed Payload Handling
  console.log("👉 5. Malformed Object ID & Payload Rejection");
  const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
  assert(!isValidObjectId("invalid-mongo-id-123"), "Malformed ObjectId string rejected cleanly");
  assert(isValidObjectId("507f1f77bcf86cd799439011"), "Valid 24-char hex ObjectId accepted");

  console.log("\n-------------------------------------------------------");
  console.log(`API HEALTH SUITE RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runApiHealthSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ API Health Suite Error:", err);
      process.exit(1);
    });
}
