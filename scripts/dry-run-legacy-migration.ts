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
  // Ignore
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
  UserModel,
} from "../src/lib/db/models";

export interface LegacyAuditSummary {
  collection: string;
  totalRecords: number;
  unassignedCount: number;
  resolvableViaParent: number;
  ambiguousCount: number;
  resolutionStrategy: string;
}

export async function runLegacyDryRunAudit(): Promise<LegacyAuditSummary[]> {
  await connectDB();
  console.log("\n=======================================================================");
  console.log("   LEGACY DATA OWNERSHIP & MIGRATION DRY-RUN AUDIT REPORT");
  console.log("=======================================================================\n");

  const results: LegacyAuditSummary[] = [];

  // 1. Clients
  {
    const total = await ClientModel.countDocuments({});
    const unassigned = await ClientModel.countDocuments({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    });
    results.push({
      collection: "clients",
      totalRecords: total,
      unassignedCount: unassigned,
      resolvableViaParent: 0,
      ambiguousCount: unassigned,
      resolutionStrategy: "Manual review / Legal entity verification (Parent is root)",
    });
  }

  // 2. Projects
  {
    const total = await ProjectModel.countDocuments({});
    const unassignedDocs = await ProjectModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id clientId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.clientId) {
        const client = await ClientModel.findById(doc.clientId).select("companyId").lean();
        if (client?.companyId) resolvable++;
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "projects",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Client.companyId; quarantine orphans",
    });
  }

  // 3. Quotations
  {
    const total = await QuotationModel.countDocuments({});
    const unassignedDocs = await QuotationModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id projectId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.projectId) {
        const project = await ProjectModel.findById(doc.projectId).select("companyId").lean();
        if (project?.companyId) resolvable++;
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "quotations",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Project.companyId; quarantine orphans",
    });
  }

  // 4. Purchase Orders
  {
    const total = await PurchaseOrderModel.countDocuments({});
    const unassignedDocs = await PurchaseOrderModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id projectId quotationId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.projectId) {
        const project = await ProjectModel.findById(doc.projectId).select("companyId").lean();
        if (project?.companyId) {
          resolvable++;
          continue;
        }
      }
      if (doc.quotationId) {
        const quote = await QuotationModel.findById(doc.quotationId).select("companyId").lean();
        if (quote?.companyId) {
          resolvable++;
        }
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "purchaseorders",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Project.companyId or Quotation.companyId",
    });
  }

  // 5. Invoices
  {
    const total = await InvoiceModel.countDocuments({});
    const unassignedDocs = await InvoiceModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id projectId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.projectId) {
        const project = await ProjectModel.findById(doc.projectId).select("companyId").lean();
        if (project?.companyId) resolvable++;
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "invoices",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Project.companyId; quarantine orphans",
    });
  }

  // 6. Payments
  {
    const total = await PaymentModel.countDocuments({});
    const unassignedDocs = await PaymentModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id invoiceId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.invoiceId) {
        const invoice = await InvoiceModel.findById(doc.invoiceId).select("companyId").lean();
        if (invoice?.companyId) resolvable++;
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "payments",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Invoice.companyId; quarantine orphans",
    });
  }

  // 7. Expenses
  {
    const total = await ExpenseModel.countDocuments({});
    const unassignedDocs = await ExpenseModel.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).select("_id projectId").lean();

    let resolvable = 0;
    for (const doc of unassignedDocs) {
      if (doc.projectId) {
        const project = await ProjectModel.findById(doc.projectId).select("companyId").lean();
        if (project?.companyId) resolvable++;
      }
    }
    const ambiguous = unassignedDocs.length - resolvable;
    results.push({
      collection: "expenses",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: resolvable,
      ambiguousCount: ambiguous,
      resolutionStrategy: "Inherit from Project.companyId; quarantine general overhead",
    });
  }

  // 8. Users
  {
    const total = await UserModel.countDocuments({});
    const unassignedDocs = await UserModel.find({
      $or: [
        { companyIds: { $exists: false } },
        { companyIds: { $size: 0 } },
        { primaryCompanyId: { $exists: false } },
        { primaryCompanyId: null },
      ],
    }).select("_id role email").lean();

    results.push({
      collection: "users",
      totalRecords: total,
      unassignedCount: unassignedDocs.length,
      resolvableViaParent: 0,
      ambiguousCount: unassignedDocs.length,
      resolutionStrategy: "Super Admin assignment required; fallback to defaultCompanyId in runtime",
    });
  }

  console.table(results);
  console.log("\nNOTE: This was a read-only dry run. Zero database records were modified.\n");
  return results;
}

if (require.main === module || process.argv[1]?.includes("dry-run-legacy-migration")) {
  runLegacyDryRunAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Dry run audit failed:", err);
      process.exit(1);
    });
}
