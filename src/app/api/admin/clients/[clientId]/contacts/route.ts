import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ClientModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import { authErrorResponse } from "@/lib/api/route-auth";
import { listContacts } from "@/lib/services/business/contact.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await connectDB();
    const { clientId } = await params;

    const existingClient = await ClientModel.findById(clientId).select("companyId").lean();
    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.view",
      companyId: existingClient.companyId ? String(existingClient.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    const items = await listContacts({ clientId });
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to list client contacts");
  }
}
