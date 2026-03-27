import { hashPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/connect";
import {
  ActivityLogModel,
  ClientModel,
  CompanyModel,
  ExpenseModel,
  InvoiceModel,
  PaymentModel,
  ProjectModel,
  PurchaseOrderModel,
  QuotationModel,
  UserModel,
} from "@/lib/db/models";

export interface InitializeSystemInput {
  setupSecret: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  createSampleData?: boolean;
}

function assertSetupSecret(secret: string) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) {
    throw new Error("SETUP_SECRET_MISSING");
  }
  if (secret !== expected) {
    throw new Error("SETUP_SECRET_INVALID");
  }
}

export async function initializeSystem(input: InitializeSystemInput) {
  assertSetupSecret(input.setupSecret);
  const db = await connectDB();

  const models = [
    UserModel,
    CompanyModel,
    ClientModel,
    ProjectModel,
    QuotationModel,
    PurchaseOrderModel,
    InvoiceModel,
    PaymentModel,
    ExpenseModel,
    ActivityLogModel,
  ];

  // Force-create Mongo collections so they are visible immediately.
  await Promise.all(models.map(async (m) => m.createCollection().catch(() => null)));

  const existingAdmin = await UserModel.findOne({ role: "admin" }).lean();
  if (!existingAdmin) {
    const hashed = await hashPassword(input.adminPassword);
    await UserModel.create({
      name: input.adminName.trim(),
      email: input.adminEmail.trim().toLowerCase(),
      password: hashed,
      role: "admin",
      phone: "",
      isActive: true,
      signatureUrl: "",
    });
  }

  let primaryCompany = await CompanyModel.findOne({ isPrimary: true }).lean();
  if (!primaryCompany) {
    const createdPrimary = await CompanyModel.create({
      name: "Sec DocuTrade",
      address: "",
      contactName: input.adminName.trim(),
      email: input.adminEmail.trim().toLowerCase(),
      website: "",
      logoText: "",
      signatureText: "",
      defaultTax: { taxRate: 0, taxEnabled: false },
      isPrimary: true,
    });
    primaryCompany = createdPrimary.toObject();
  }

  if (input.createSampleData) {
    const anyClient = await ClientModel.findOne().lean();
    if (!anyClient) {
      const admin = await UserModel.findOne({ role: "admin" }).lean();
      if (admin?._id) {
        const client = await ClientModel.create({
          name: "Demo Client",
          company: "Demo Company",
          address: "Demo Address",
          email: "client@example.com",
          phone: "",
          clientLogoText: "",
          clientSignatureText: "",
          companyId: primaryCompany?._id,
          createdBy: admin._id,
        });
        await ProjectModel.create({
          name: "Demo Project",
          description: "Initial sample project",
          clientId: client._id,
          assignedTo: [admin._id],
          status: "lead",
          priority: "medium",
        });
      }
    }
  }

  return {
    ok: true,
    dbName: db.connection.name,
  };
}
