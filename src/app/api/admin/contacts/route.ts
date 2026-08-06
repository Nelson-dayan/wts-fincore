import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { createContact, listContacts } from "@/lib/services/business/contact.service";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const status = (url.searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined;

    const items = await listContacts({ companyId, clientId, q, status });
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error, "Failed to list contacts");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    const body = await req.json();

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ message: "First name and last name are required." }, { status: 400 });
    }

    const companyId = body.companyId || (session.user as any).companyId || session.user.id;

    const contact = await createContact({
      companyId: String(companyId),
      clientId: body.clientId ? String(body.clientId) : null,
      firstName,
      lastName,
      email: body.email ? String(body.email).trim() : "",
      phone: body.phone ? String(body.phone).trim() : "",
      alternatePhone: body.alternatePhone ? String(body.alternatePhone).trim() : "",
      jobTitle: body.jobTitle ? String(body.jobTitle).trim() : "",
      department: body.department ? String(body.department).trim() : "",
      notes: body.notes ? String(body.notes).trim() : "",
      status: body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      createdBy: session.user.id,
    });

    return NextResponse.json({ item: contact }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create contact");
  }
}
