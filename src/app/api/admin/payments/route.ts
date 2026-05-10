import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { PaymentModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { parsePagination, parseSearch } from "@/lib/api/pagination";
import { recordPayment } from "@/lib/services/business/payment.service";
import { assertEmployeeCanAccessInvoice } from "@/lib/auth/employee-resource-access";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const invoiceId = url.searchParams.get("invoiceId");

    const filter: Record<string, any> = { isDeleted: { $ne: true } };
    if (invoiceId) {
      if (session.user.role === "employee") {
        try {
          await assertEmployeeCanAccessInvoice(session.user.id, invoiceId);
        } catch (e) {
          if (e instanceof Error && e.message === "FORBIDDEN") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
          }
          if (e instanceof Error && e.message === "NOT_FOUND") {
            return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false });
          }
          throw e;
        }
      }
      filter.invoiceId = invoiceId;
    } else if (session.user.role === "employee") {
      return NextResponse.json({ message: "invoiceId is required" }, { status: 400 });
    }

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean(),
      PaymentModel.countDocuments(filter),
    ]);
    return NextResponse.json({ items, page, limit, total, hasMore: skip + items.length < total });
  } catch (error) {
    return authErrorResponse(error, "Failed to load payments");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    const body = await req.json();

    if (session.user.role === "employee") {
      const invId = String(body?.invoiceId ?? "").trim();
      if (!invId) {
        return NextResponse.json({ message: "invoiceId is required" }, { status: 400 });
      }
      try {
        await assertEmployeeCanAccessInvoice(session.user.id, invId);
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        if (e instanceof Error && e.message === "NOT_FOUND") {
          return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
        }
        throw e;
      }
    }

    // Ensure createdBy is set from the session user
    body.createdBy = session.user.id;
    
    const result = await recordPayment(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to record payment");
  }
}
