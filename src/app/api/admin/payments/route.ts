import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel, PaymentAllocationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { recordPayment } from "@/lib/services/business/payment.service";
import { assertEmployeeCanAccessInvoice, assertEmployeeCanAccessProject } from "@/lib/auth/employee-resource-access";

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
  try {
    const session = await requireRole(["admin", "employee"]);
    const body = await req.json();

    const pId = String(body?.projectId ?? "").trim();
    if (!pId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessProject(session.user.id, pId);
      } catch (e) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    // Ensure createdBy is set from the session user
    body.createdBy = session.user.id;
    
    const result = await recordPayment(body);
    return NextResponse.json({ 
      item: { 
        ...result, 
        _id: result.paymentId 
      } 
    }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to record payment");
  }
}
