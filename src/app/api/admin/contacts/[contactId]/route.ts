import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ContactModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
import { authErrorResponse } from "@/lib/api/route-auth";
import { deleteContact, getContactById, updateContact } from "@/lib/services/business/contact.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    await connectDB();
    const { contactId } = await params;

    const contact = await ContactModel.findById(contactId).select("companyId").lean();
    if (!contact) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.view",
      companyId: contact.companyId ? String(contact.companyId) : undefined,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

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
    await connectDB();
    const { contactId } = await params;

    const contact = await ContactModel.findById(contactId).select("companyId").lean();
    if (!contact) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.edit",
      companyId: contact.companyId ? String(contact.companyId) : undefined,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

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
    await connectDB();
    const { contactId } = await params;

    const contact = await ContactModel.findById(contactId).select("companyId").lean();
    if (!contact) {
      return NextResponse.json({ message: "Contact not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.edit",
      companyId: contact.companyId ? String(contact.companyId) : undefined,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

    const success = await deleteContact(contactId);
    if (!success) {
      return NextResponse.json({ message: "Contact not found or already deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete contact");
  }
}
