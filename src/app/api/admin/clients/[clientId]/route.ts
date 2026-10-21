import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { sanitizeText } from "@/lib/security/sanitize";
import { authorizeResource } from "@/lib/auth/authorization";

interface RouteCtx {
  params: Promise<{ clientId: string }>;
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { clientId } = await ctx.params;

    const existingClient = await ClientModel.findById(clientId).select("companyId").lean();
    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.edit",
      companyId: existingClient.companyId ? String(existingClient.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;
    const body = (await req.json()) as {
      name?: string;
      company?: string;
      website?: string;
      address?: string;
      email?: string;
      phone?: string;
      clientLogoText?: string;
      clientSignatureText?: string;
      taxId?: string;
      currency?: string;
      paymentTerms?: string;
      notes?: string;
      billingAddress?: string;
      shippingAddress?: string;
      country?: string;
      state?: string;
      city?: string;
      zipCode?: string;
    };

    const $set: Record<string, unknown> = {};
    if (body.name !== undefined) $set.name = sanitizeText(body.name).trim();
    if (body.company !== undefined) $set.company = sanitizeText(body.company).trim();
    if (body.website !== undefined) $set.website = sanitizeText(body.website).trim();
    if (body.address !== undefined) $set.address = sanitizeText(body.address).trim();
    if (body.email !== undefined) $set.email = sanitizeText(body.email).trim().toLowerCase();
    if (body.phone !== undefined) $set.phone = sanitizeText(body.phone).trim();
    if (body.clientLogoText !== undefined) {
      const t = sanitizeText(body.clientLogoText).trim();
      $set.clientLogoText = t;
      $set.clientLogoUrl = t;
    }
    if (body.clientSignatureText !== undefined) {
      $set.clientSignatureText = sanitizeText(body.clientSignatureText).trim();
    }
    if (body.taxId !== undefined) $set.taxId = sanitizeText(body.taxId).trim();
    if (body.currency !== undefined) $set.currency = sanitizeText(body.currency).trim().toUpperCase();
    if (body.paymentTerms !== undefined) $set.paymentTerms = sanitizeText(body.paymentTerms).trim();
    if (body.notes !== undefined) $set.notes = sanitizeText(body.notes).trim();
    if (body.billingAddress !== undefined) $set.billingAddress = sanitizeText(body.billingAddress).trim();
    if (body.shippingAddress !== undefined) $set.shippingAddress = sanitizeText(body.shippingAddress).trim();
    if (body.country !== undefined) $set.country = sanitizeText(body.country).trim();
    if (body.state !== undefined) $set.state = sanitizeText(body.state).trim();
    if (body.city !== undefined) $set.city = sanitizeText(body.city).trim();
    if (body.zipCode !== undefined) $set.zipCode = sanitizeText(body.zipCode).trim();

    const updated = await ClientModel.findByIdAndUpdate(
      clientId,
      { $set },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.userId,
      action: "updated_client",
      entityType: "client",
      entityId: String(updated._id),
      message: `Updated client ${updated.name}`,
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    return authErrorResponse(error, "Failed to update client");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    await connectDB();
    const { clientId } = await ctx.params;

    const existingClient = await ClientModel.findById(clientId).select("companyId").lean();
    if (!existingClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "clients.delete",
      companyId: existingClient.companyId ? String(existingClient.companyId) : undefined,
      clientId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;

    const linkedProjectCount = await ProjectModel.countDocuments({ clientId });
    if (linkedProjectCount > 0) {
      return NextResponse.json(
        {
          message:
            "Client cannot be deleted because it has linked projects. Remove projects first.",
        },
        { status: 400 }
      );
    }
    const deleted = await ClientModel.findByIdAndDelete(clientId).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    await logActivity({
      userId: session.userId,
      action: "deleted_client",
      entityType: "client",
      entityId: String(deleted._id),
      message: `Deleted client ${deleted.name}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "Failed to delete client");
  }
}
