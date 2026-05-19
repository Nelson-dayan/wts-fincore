import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { recordPayment } from "@/lib/services/business/payment.service";
import { assertEmployeeCanAccessInvoice, assertEmployeeCanAccessProject } from "@/lib/auth/employee-resource-access";

import { checkOrCreateIdempotency, saveIdempotencySuccess, saveIdempotencyFailed } from "@/lib/services/business/idempotency.service";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    
    const invoiceId = url.searchParams.get("invoiceId");
    const projectId = url.searchParams.get("projectId");
    const accountId = url.searchParams.get("accountId");

    const filter: Record<string, any> = { isDeleted: { $ne: true } };

    if (invoiceId) {
      if (session.user.role === "employee") {
        try {
          await assertEmployeeCanAccessInvoice(session.user.id, invoiceId);
        } catch (e) {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
      }
      const allocations = await PaymentAllocationModel.find({ invoiceId, isDeleted: { $ne: true } }).select("paymentId").lean();
      filter._id = { $in: allocations.map(a => a.paymentId) };
    } else if (projectId) {
      if (session.user.role === "employee") {
        try {
          await assertEmployeeCanAccessProject(session.user.id, projectId);
        } catch (e) {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
      }
      filter.projectId = projectId;
    } else if (session.user.role === "employee") {
      return NextResponse.json({ message: "Filter required" }, { status: 400 });
    }

    if (accountId && session.user.role === "admin") {
      filter.accountId = accountId;
    }

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
      .sort({ receivedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("accountId", "name currency")
      .populate("projectId", "name")
      .lean(),
      PaymentModel.countDocuments(filter),
    ]);

    // Convert Mongoose Decimal128 to numbers for React rendering
    const sanitizedItems = JSON.parse(JSON.stringify(items), (key, value) => {
      if (value && typeof value === 'object' && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      return value;
    });

    return NextResponse.json({ items: sanitizedItems, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load payments");
  }
}

export async function POST(req: Request) {
  let idempotencyKey: string | null = null;
  let userId: string = "";
  let isIdempotencyEnabled = false;

  try {
    const session = await requireRole(["admin", "employee"]);
    userId = session.user.id;
    await connectDB();

    const body = await req.json();

    idempotencyKey = req.headers.get("Idempotency-Key")?.trim() ?? null;
    if (idempotencyKey) {
      try {
        const check = await checkOrCreateIdempotency(
          idempotencyKey,
          userId,
          "/api/admin/payments",
          body
        );

        if (check.status === "CACHED") {
          return NextResponse.json(check.responseBody, { status: check.responseStatus });
        }
        if (check.status === "IN_PROGRESS") {
          return NextResponse.json({ message: "Request already in progress" }, { status: 409 });
        }
        isIdempotencyEnabled = true;
      } catch (e: any) {
        if (e.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
          return NextResponse.json(
            { message: "Idempotency key reused with a different body payload" },
            { status: 409 }
          );
        }
        throw e;
      }
    }

    const pId = String(body?.projectId ?? "").trim();
    if (!pId) {
      if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessProject(session.user.id, pId);
      } catch (e) {
        if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const { ProjectModel } = await import("@/lib/db/models");
    const project = await ProjectModel.findById(pId).select("clientId companyId").lean();
    if (!project) {
      if (isIdempotencyEnabled) await saveIdempotencyFailed(idempotencyKey!, userId);
      return NextResponse.json({ message: "Project not found" }, { status: 400 });
    }
    body.clientId = project.clientId;
    body.companyId = project.companyId;

    // Ensure createdBy is set from the session user
    body.createdBy = session.user.id;
    
    const result = await recordPayment(body);
    const resData = { 
      item: { 
        ...result, 
        _id: result.paymentId 
      } 
    };

    if (isIdempotencyEnabled) {
      await saveIdempotencySuccess(idempotencyKey!, userId, resData, 201);
    }

    return NextResponse.json(resData, { status: 201 });
  } catch (error) {
    if (isIdempotencyEnabled && idempotencyKey) {
      await saveIdempotencyFailed(idempotencyKey, userId);
    }
    return authErrorResponse(error, "Failed to record payment");
  }
}
