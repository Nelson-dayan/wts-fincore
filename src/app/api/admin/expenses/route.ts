import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { ExpenseModel, ProjectModel, ClientModel, CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { logActivity } from "@/lib/services/activity/log-activity.service";
import { decimalToNumber } from "@/lib/services/business/money";
import { normalizeToBase } from "@/lib/services/finance/forex.engine";
import {
  assertEmployeeCanAccessProject,
  getEmployeeAssignedProjectIdStrings,
} from "@/lib/auth/employee-resource-access";

import { authorizeResource } from "@/lib/auth/authorization";

function formatExpenseRow(row: Record<string, unknown>) {
  const proj = row.projectId as unknown;
  let projectId = "";
  let projectName = "—";
  if (proj && typeof proj === "object" && proj !== null && "_id" in proj) {
    projectId = String((proj as { _id: unknown })._id);
    const n = (proj as { name?: string }).name;
    projectName = n ? String(n) : "—";
  } else if (proj) {
    projectId = String(proj);
  }
  const amount = row.amount;
  return {
    _id: row._id,
    title: row.title,
    amount: amount !== undefined && amount !== null ? decimalToNumber(amount) : amount,
    category: row.category,
    projectId,
    projectName,
    createdAt: row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || undefined;
    const projectId = url.searchParams.get("projectId") || undefined;

    const auth = await authorizeResource({
      permission: "expenses.view",
      projectId,
      companyId: targetCompanyId,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to view expenses", code: auth.code }, { status: 403 });
    }

    const session = auth.session;
    const companyContext = auth.context;
    await connectDB();
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = parseSearch(url.searchParams);

    const parts: Record<string, unknown>[] = [];
    parts.push({ isDeleted: { $ne: true } });
    parts.push({
      $or: [
        { companyId: { $in: companyContext.allowedCompanyIds } },
        { companyId: { $exists: false } },
        { companyId: null },
      ],
    });

    if (session.user.role === "employee") {
      const employeeProjectIds = await getEmployeeAssignedProjectIdStrings(session.user.id);
      if (employeeProjectIds.length === 0) {
        return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
      }
      if (projectId) {
        if (!employeeProjectIds.includes(projectId)) {
          return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
        }
        parts.push({ projectId });
      } else {
        parts.push({ projectId: { $in: employeeProjectIds } });
      }
    } else if (projectId) {
      parts.push({ projectId });
    }

    if (q) {
      parts.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { category: { $regex: q, $options: "i" } },
        ],
      });
    }

    const filter: Record<string, unknown> =
      parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { $and: parts };

    const [itemsRaw, total] = await Promise.all([
      ExpenseModel.find(filter)
        .select("title amount category projectId createdAt")
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExpenseModel.countDocuments(filter),
    ]);
    const items = itemsRaw.map((row) => formatExpenseRow(row as Record<string, unknown>));
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load expenses");
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = (await req.json()) as {
      title?: string;
      amount?: number;
      category?: string;
      projectId?: string;
      note?: string;
    };
    const title = String(body.title ?? "").trim();
    const category = String(body.category ?? "").trim();
    const amount = Number(body.amount ?? 0);
    const projectId = String(body.projectId ?? "").trim();
    const note = String(body.note ?? "").trim();

    if (!title || !category || amount <= 0) {
      return NextResponse.json(
        { message: "title, category and amount (>0) are required" },
        { status: 400 }
      );
    }
    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    const project = await ProjectModel.findById(projectId).select("companyId clientId currency").lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 400 });
    }

    let resolvedCompanyId = (project as any).companyId ? String((project as any).companyId) : undefined;
    if (!resolvedCompanyId && project.clientId) {
      const client = await ClientModel.findById(project.clientId).select("companyId").lean();
      if (client?.companyId) {
        resolvedCompanyId = String(client.companyId);
      }
    }

    const url = new URL(req.url);
    const targetCompanyId = req.headers.get("x-company-id") || url.searchParams.get("companyId") || resolvedCompanyId;

    const auth = await authorizeResource({
      permission: "expenses.create",
      projectId,
      companyId: targetCompanyId,
    });

    if (!auth.authorized) {
      return NextResponse.json({ message: auth.reason || "Unauthorized to create expense", code: auth.code }, { status: 403 });
    }

    const session = auth.session;
    const companyContext = auth.context;

    const companyId = resolvedCompanyId || companyContext.activeCompanyId;

    const currency = project.currency || "INR";
    const norm = normalizeToBase({ amount, currency });
    const baseAmount = norm.amount;
    const exchangeRate = norm.rate;

    const created = await ExpenseModel.create({
      title,
      amount,
      category,
      currency,
      baseAmount,
      amountBase: baseAmount,
      exchangeRate,
      companyId,
      projectId,
      note,
      createdBy: session.user.id,
    });

    await logActivity({
      userId: session.user.id,
      action: "created_expense",
      entityType: "expense",
      entityId: String(created._id),
      message: `Created expense ${created.title}`,
      projectId: created.projectId ? String(created.projectId) : undefined,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create expense");
  }
}
