import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import { deleteContact, getContactById, updateContact } from "@/lib/services/business/contact.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { contactId } = await params;
    const item = await getContactById(contactId);
    if (!item) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error, "Failed to get contact");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { contactId } = await params;
    const body = await req.json();

    const updated = await updateContact(contactId, {
      clientId: body.clientId !== undefined ? (body.clientId ? String(body.clientId) : null) : undefined,
      firstName: body.firstName !== undefined ? String(body.firstName).trim() : undefined,
      lastName: body.lastName !== undefined ? String(body.lastName).trim() : undefined,
      email: body.email !== undefined ? String(body.email).trim() : undefined,
      phone: body.phone !== undefined ? String(body.phone).trim() : undefined,
      alternatePhone: body.alternatePhone !== undefined ? String(body.alternatePhone).trim() : undefined,
      jobTitle: body.jobTitle !== undefined ? String(body.jobTitle).trim() : undefined,
      department: body.department !== undefined ? String(body.department).trim() : undefined,
      notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
      status: body.status !== undefined ? (body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") : undefined,
    });

    if (!updated) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update contact");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { contactId } = await params;
    const success = await deleteContact(contactId);
    if (!success) {
      return NextResponse.json({ message: "Contact not found or already deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete contact");
  }
}
