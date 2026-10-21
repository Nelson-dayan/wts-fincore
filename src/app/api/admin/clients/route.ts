import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, ClientModel, ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch, escapeRegex } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { sanitizeText } from "@/lib/security/sanitize";
import { resolveAuthCompanyContext } from "@/lib/auth/company-context";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const session = await requireRole(["admin"]);
    await connectDB();
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, scopeMode);
    const allowedCompanyIds = companyContext.allowedCompanyIds;

    const primaryCompany = await CompanyModel.findOne({ isPrimary: true, isActive: true, deletedAt: null }).select("_id").lean();
    const isPrimaryActive = primaryCompany && allowedCompanyIds.includes(String(primaryCompany._id));

    const filter: Record<string, unknown> = {};
    if (isPrimaryActive) {
      filter.$or = [
        { companyId: { $in: allowedCompanyIds } },
        { companyId: { $exists: false } },
        { companyId: null },
      ];
    } else {
      filter.companyId = { $in: allowedCompanyIds };
    }

    if (q) {
      const safeQ = escapeRegex(q);
      const qCond = {
        $or: [
          { name: { $regex: safeQ, $options: "i" } },
          { company: { $regex: safeQ, $options: "i" } },
          { email: { $regex: safeQ, $options: "i" } },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as any[] }, qCond];
        delete filter.$or;
      } else {
        filter.$or = qCond.$or;
      }
    }
    const [itemsRaw, total] = await Promise.all([
      ClientModel.find(filter)
      .select("name company email phone website address billingAddress shippingAddress taxId currency paymentTerms country state city zipCode notes clientLogoText clientSignatureText createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      ClientModel.countDocuments(filter),
    ]);
    const clientIds = itemsRaw.map((item) => item._id);
    const projectAgg = await ProjectModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { clientId: { $in: clientIds } } },
      { $group: { _id: "$clientId", count: { $sum: 1 } } },
    ]);
    const projectCountMap = new Map(
      projectAgg.map((entry) => [String(entry._id), entry.count])
    );
    const items = itemsRaw.map((item) => ({
      ...item,
      _id: String(item._id),
      projectsCount: projectCountMap.get(String(item._id)) ?? 0,
    }));
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load clients");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
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
      companyId?: string;
      parentCompanyId?: string;
    };

    const targetCompanyId = body.companyId || req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const companyContext = await resolveAuthCompanyContext(session.user, targetCompanyId, "single");

    const effectiveCompanyId = body.companyId || companyContext.activeCompanyId;
    if (!companyContext.allowedCompanyIds.includes(String(effectiveCompanyId))) {
      return NextResponse.json(
        { message: "Target company is outside your authorized operating scope." },
        { status: 403 }
      );
    }
    const name = sanitizeText(body.name).trim();
    const company = sanitizeText(body.company).trim();
    const email = sanitizeText(body.email).trim().toLowerCase();
    const phone = sanitizeText(body.phone).trim();
    const address = sanitizeText(body.address).trim();
    if (!name || !company || !email || !phone || !address) {
      return NextResponse.json(
        {
          message:
            "Name, Client Company, Email, Phone, and Address are required.",
        },
        { status: 400 }
      );
    }

    const created = await ClientModel.create({
      name,
      company,
      website: sanitizeText(body.website).trim(),
      address,
      email,
      phone,
      clientLogoUrl: sanitizeText(body.clientLogoText).trim(),
      clientLogoText: sanitizeText(body.clientLogoText).trim(),
      clientSignatureText: sanitizeText(body.clientSignatureText).trim(),
      taxId: sanitizeText(body.taxId).trim(),
      currency: sanitizeText(body.currency ?? "AED").trim().toUpperCase(),
      paymentTerms: sanitizeText(body.paymentTerms).trim(),
      notes: sanitizeText(body.notes).trim(),
      billingAddress: sanitizeText(body.billingAddress).trim(),
      shippingAddress: sanitizeText(body.shippingAddress).trim(),
      country: sanitizeText(body.country).trim(),
      state: sanitizeText(body.state).trim(),
      city: sanitizeText(body.city).trim(),
      zipCode: sanitizeText(body.zipCode).trim(),
      companyId: effectiveCompanyId,
      parentCompanyId: body.parentCompanyId ? body.parentCompanyId : undefined,
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_client",
      entityType: "client",
      entityId: String(created._id),
      message: `Created client ${created.name}`,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create client");
  }
}
