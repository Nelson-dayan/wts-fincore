import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ClientModel, ProjectModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";

import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const scopeMode = (req.headers.get("x-scope-mode") || url.searchParams.get("scopeMode")) as "single" | "group" || "single";

    const companyContext = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, scopeMode);

    const filter: Record<string, unknown> = {};
    if (companyContext.activeCompany?.isPrimary) {
      filter.$or = [
        { companyId: { $in: companyContext.allowedCompanyIds } },
        { companyId: { $exists: false } },
        { companyId: null },
      ];
    } else {
      filter.companyId = { $in: companyContext.allowedCompanyIds };
    }

    if (q) {
      const qCond = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { company: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
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
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId");
    const companyContext = await CompanyHierarchyService.resolveCompanyContext(targetCompanyId, "single");

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
    const name = String(body.name ?? "").trim();
    const company = String(body.company ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
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
      website: String(body.website ?? ""),
      address,
      email,
      phone,
      clientLogoUrl: String(body.clientLogoText ?? ""),
      clientLogoText: String(body.clientLogoText ?? ""),
      clientSignatureText: String(body.clientSignatureText ?? ""),
      taxId: String(body.taxId ?? "").trim(),
      currency: String(body.currency ?? "AED").trim().toUpperCase(),
      paymentTerms: String(body.paymentTerms ?? "").trim(),
      notes: String(body.notes ?? "").trim(),
      billingAddress: String(body.billingAddress ?? "").trim(),
      shippingAddress: String(body.shippingAddress ?? "").trim(),
      country: String(body.country ?? "").trim(),
      state: String(body.state ?? "").trim(),
      city: String(body.city ?? "").trim(),
      zipCode: String(body.zipCode ?? "").trim(),
      companyId: body.companyId ? body.companyId : companyContext.companyId,
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
