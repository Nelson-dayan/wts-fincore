import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, InvoiceModel, PaymentModel, PaymentAllocationModel, ProjectModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await connectDB();
    const { clientId } = await params;

    // 1. Fetch Client info
    const client = await ClientModel.findById(clientId).lean();
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.view",
      companyId: client.companyId ? String(client.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    // 2. Fetch all Client projects
    const projects = await ProjectModel.find({ clientId, isDeleted: { $ne: true } }).lean();
    const projectIds = projects.map(p => p._id);

    // 3. Fetch all active invoices (debits)
    const invoices = await InvoiceModel.find({
      projectId: { $in: projectIds },
      lifecycleStatus: { $ne: "DRAFT_HIDDEN" },
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: 1 })
    .lean();

    // 4. Fetch all payments (credits)
    const payments = await PaymentModel.find({
      clientId,
      isDeleted: { $ne: true }
    })
    .sort({ receivedAt: 1 })
    .lean();

    // 5. Fetch all allocations
    const paymentIds = payments.map(p => p._id);
    const allocations = await PaymentAllocationModel.find({
      paymentId: { $in: paymentIds }
    })
    .populate("invoiceId", "invoiceNumber")
    .lean();

    // Helper to safely convert Decimals to floats
    const sanitize = (obj: any) => {
      return JSON.parse(JSON.stringify(obj), (key, value) => {
        if (value && typeof value === 'object' && value.$numberDecimal) {
          return parseFloat(value.$numberDecimal);
        }
        return value;
      });
    };

    return NextResponse.json({
      client: sanitize(client),
      projects: sanitize(projects),
      invoices: sanitize(invoices),
      payments: sanitize(payments),
      allocations: sanitize(allocations)
    });
  } catch (error) {
    console.error("CLIENT STATEMENT ENDPOINT ERROR:", error);
    return NextResponse.json({ message: "Failed to load statement details" }, { status: 500 });
  }
}
