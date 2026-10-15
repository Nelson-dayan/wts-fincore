import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parseSearch } from "@/lib/api/pagination";
import { createContact, listContacts } from "@/lib/services/business/contact.service";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";
    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, scopeMode);

    const clientId = url.searchParams.get("clientId") || undefined;
    const q = parseSearch(url.searchParams) || undefined;
    const status = (url.searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined;

    const items = await listContacts({
      companyIds: companyContext.allowedCompanyIds,
      clientId,
      q,
      status,
    });
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

    const targetCompanyId = body.companyId || req.headers.get("x-company-id");
    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, "single");
    const effectiveCompanyId = companyContext.activeCompanyId;

    if (!companyContext.allowedCompanyIds.includes(effectiveCompanyId)) {
      return NextResponse.json({ message: "Unauthorized company selection" }, { status: 403 });
    }

    const contact = await createContact({
      companyId: effectiveCompanyId,
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
