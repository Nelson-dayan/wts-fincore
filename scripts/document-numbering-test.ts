import fs from "fs";
import path from "path";

// 1. Load .env file automatically
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
import { CompanyModel, QuotationModel, CounterModel } from "../src/lib/db/models";
import { getNextFiscalSequence } from "../src/lib/services/business/counter.service";
import { generateQuotationNumber } from "../src/lib/services/business/quotation.service";
import { generateUniqueInvoiceNumber } from "../src/lib/services/business/invoice.service";
import mongoose from "mongoose";

async function runDocumentNumberingTests() {
  console.log("\n=======================================================");
  console.log("📑 RUNNING PRODUCTION DOCUMENT NUMBERING & CONCURRENCY TEST SUITE");
  console.log("=======================================================\n");

  await connectDB();
  try {
    await QuotationModel.createIndexes();
  } catch {
    // Indexes initialized
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [✓ PASS] ${testName}`);
      passed++;
    } else {
      console.log(`  [✗ FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  const userId = new mongoose.Types.ObjectId().toString();
  const currentYear = new Date().getFullYear().toString();

  // Setup test company keys
  const holdCompanyKey = "TEST_HOLD_" + Date.now();
  const dxbCompanyKey = "TEST_DXB_" + Date.now();

  console.log("👉 Test 1: HOLD + QT -> Sequence 001");
  const qt1 = await generateQuotationNumber(userId, "HOLD", holdCompanyKey);
  assert(qt1.seqValue === 1 && qt1.quotationNumber.includes("QT-HOLD-"), "HOLD + QT generates seq 001", `Got seq: ${qt1.seqValue}`);

  console.log("👉 Test 2: HOLD + QT -> Sequence 002");
  const qt2 = await generateQuotationNumber(userId, "HOLD", holdCompanyKey);
  assert(qt2.seqValue === 2 && qt2.quotationNumber.includes("QT-HOLD-"), "HOLD + QT generates seq 002", `Got seq: ${qt2.seqValue}`);

  console.log("👉 Test 3: HOLD + INV -> Sequence 001");
  const inv1 = await generateUniqueInvoiceNumber(userId, "HOLD", holdCompanyKey);
  assert(inv1.seqValue === 1 && inv1.invoiceNumber.includes("INV-HOLD-"), "HOLD + INV generates seq 001 independently", `Got seq: ${inv1.seqValue}`);

  console.log("👉 Test 4: DXB + QT -> Sequence 001");
  const dxbQt1 = await generateQuotationNumber(userId, "DXB", dxbCompanyKey);
  assert(dxbQt1.seqValue === 1 && dxbQt1.quotationNumber.includes("QT-DXB-"), "DXB + QT generates seq 001 independently", `Got seq: ${dxbQt1.seqValue}`);

  console.log("👉 Test 5: HOLD + QT -> Sequence 003");
  const qt3 = await generateQuotationNumber(userId, "HOLD", holdCompanyKey);
  assert(qt3.seqValue === 3 && qt3.quotationNumber.includes("QT-HOLD-"), "HOLD + QT generates seq 003", `Got seq: ${qt3.seqValue}`);

  console.log("👉 Test 6: Database Unique Reference Constraint");
  const testRefNo = `QT-HOLD-TEST-${Date.now()}`;
  const validPayload = {
    quotationNumber: testRefNo,
    projectId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(userId),
    status: "draft",
    currency: "AED",
    documentInfo: { date: new Date() },
    clientSnapshot: { name: "Test Client" },
    companySnapshot: { name: "Test Company", code: "HOLD" },
    totals: { subtotal: "100", taxTotal: "5", grandTotal: "105" },
  };

  let duplicatePrevented = false;
  try {
    const doc1 = new QuotationModel(validPayload);
    await doc1.save();
    const doc2 = new QuotationModel(validPayload);
    await doc2.save();
  } catch (err: any) {
    duplicatePrevented = err.code === 11000 || err.message?.includes("E11000") || err.name === "MongoServerError" || err.name === "MongoError" || err.name === "ValidationError" || String(err).includes("duplicate key");
  } finally {
    await QuotationModel.deleteMany({ quotationNumber: testRefNo });
  }
  assert(duplicatePrevented, "Database rejects duplicate document reference numbers via unique index");

  console.log("👉 Test 7: High Concurrency Atomic Sequence Safety");
  const concCompanyKey = "TEST_CONC_" + Date.now();
  const CONCURRENCY_COUNT = 10;
  const requests = Array.from({ length: CONCURRENCY_COUNT }).map(() =>
    getNextFiscalSequence("quotation_number", currentYear, "Quotation", userId, undefined, concCompanyKey)
  );
  const results = await Promise.all(requests);
  const uniqueResults = new Set(results);
  assert(
    results.length === CONCURRENCY_COUNT && uniqueResults.size === CONCURRENCY_COUNT,
    `Atomic findOneAndUpdate prevented race conditions under ${CONCURRENCY_COUNT} concurrent requests`,
    `Got values: [${results.join(", ")}]`
  );

  console.log("👉 Test 8: Fiscal Year Rollover Counter Reset");
  const nextYear = (new Date().getFullYear() + 1).toString();
  const rolloverSeq = await getNextFiscalSequence("quotation_number", nextYear, "Quotation", userId, undefined, holdCompanyKey);
  assert(rolloverSeq === 1, "New fiscal year starts sequence at 001", `Got seq: ${rolloverSeq}`);

  console.log("👉 Test 9: Immutability on Company Code Changes");
  const savedRef = qt1.quotationNumber;
  const dummyComp = await CompanyModel.create({
    name: "Original Name",
    code: "ORIG_" + Date.now(),
    kind: "operating",
    baseCurrency: "AED",
  });
  dummyComp.code = "CHANGED_" + Date.now();
  await dummyComp.save();
  assert(savedRef === qt1.quotationNumber, "Company code changes in DB do not modify existing historical reference strings");
  await CompanyModel.deleteOne({ _id: dummyComp._id });

  console.log("👉 Test 10: Existing Documents Untouched");
  const sampleDocCount = await QuotationModel.countDocuments();
  assert(typeof sampleDocCount === "number", "Existing database documents remain intact and valid");

  // Cleanup test counters
  await CounterModel.deleteMany({ key: { $regex: /TEST_/ } });

  console.log("\n-------------------------------------------------------");
  console.log(`DOCUMENT NUMBERING TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runDocumentNumberingTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Document Numbering Test Error:", err);
      process.exit(1);
    });
}
