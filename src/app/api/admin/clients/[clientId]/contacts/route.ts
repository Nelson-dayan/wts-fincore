import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { listContacts } from "@/lib/services/business/contact.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { clientId } = await params;
    const items = await listContacts({ clientId });
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to list client contacts");
  }
}
