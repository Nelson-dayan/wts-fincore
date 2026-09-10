import mongoose from "mongoose";
import { connectDB } from "../lib/db/connect";
import {
  CompanyModel,
  ClientModel,
  ProjectModel,
  QuotationModel,
  PurchaseOrderModel,
  InvoiceModel,
  PaymentModel,
  UserModel,
} from "../lib/db/models";

export async function runMultiCompanyMigration() {
  console.log("🚀 Starting Enterprise Multi-Company ERP Backfill Migration...");
  await connectDB();

  // 1. Ensure Primary Company Exists
  let primaryCompany = await CompanyModel.findOne({ isPrimary: true, deletedAt: null });
  if (!primaryCompany) {
    primaryCompany = await CompanyModel.findOne({ deletedAt: null });
  }

  if (!primaryCompany) {
    console.log("➕ Creating initial Primary Holding Company (code: DXB)...");
    primaryCompany = await CompanyModel.create({
      name: "Docutrade Enterprise Group LLC",
      code: "DXB",
      kind: "holding",
      taxId: "100459827000003",
      baseCurrency: "AED",
      supportedCurrencies: ["AED", "USD", "INR"],
      address: "Dubai, United Arab Emirates",
      email: "finance@docutrade.com",
      website: "https://docutrade.com",
      isPrimary: true,
      isActive: true,
      branding: {
        logoText: "DOCUTRADE ENTERPRISE",
        invoicePrefix: "DXB-INV-",
        quotationPrefix: "DXB-QT-",
        poPrefix: "DXB-PO-",
      },
    });
  } else {
    // Ensure primary company has a valid code
    if (!primaryCompany.code) {
      primaryCompany.code = "DXB";
      primaryCompany.kind = primaryCompany.kind || "holding";
      await primaryCompany.save();
    }
  }

  const primaryCompanyId = primaryCompany._id;
  console.log(`✅ Primary Company established: "${primaryCompany.name}" [${primaryCompany.code}] (ID: ${primaryCompanyId})`);

  // 2. Backfill Clients
  const clientRes = await ClientModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId, parentCompanyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Clients: ${clientRes.modifiedCount} updated.`);

  // 3. Backfill Projects
  const projectRes = await ProjectModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Projects: ${projectRes.modifiedCount} updated.`);

  // 4. Backfill Quotations
  const quotationRes = await QuotationModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Quotations: ${quotationRes.modifiedCount} updated.`);

  // 5. Backfill Purchase Orders
  const poRes = await PurchaseOrderModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Purchase Orders: ${poRes.modifiedCount} updated.`);

  // 6. Backfill Invoices
  const invRes = await InvoiceModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Invoices: ${invRes.modifiedCount} updated.`);

  // 7. Backfill Payments
  const payRes = await PaymentModel.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: primaryCompanyId } }
  );
  console.log(`✅ Backfilled Payments: ${payRes.modifiedCount} updated.`);

  // 8. Backfill Users with Company Memberships & Default Company
  const users = await UserModel.find({});
  let userCount = 0;
  for (const user of users) {
    let updated = false;
    if (!user.companyMemberships || user.companyMemberships.length === 0) {
      user.companyMemberships = [
        {
          companyId: primaryCompanyId,
          role: user.role === "admin" ? "group_admin" : "employee",
          permissions: ["all"],
          isDefault: true,
          joinedAt: new Date(),
        },
      ];
      updated = true;
    }
    if (!user.defaultCompanyId) {
      user.defaultCompanyId = primaryCompanyId;
      updated = true;
    }
    if (updated) {
      await user.save();
      userCount++;
    }
  }
  console.log(`✅ Backfilled Users with company memberships: ${userCount} users updated.`);

  console.log("🎉 Multi-Company ERP Migration Completed Successfully!");
}

if (require.main === module) {
  runMultiCompanyMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}
