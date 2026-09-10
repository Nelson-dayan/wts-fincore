import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { decimalToNumber } from "@/lib/services/business/money";
import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";
import { renderQuotationDocx } from "@/lib/services/business/quotation-render-docx";
import { renderQuotationPdf } from "@/lib/services/business/quotation-render-pdf";
import { assertEmployeeCanAccessQuotation } from "@/lib/auth/employee-resource-access";

interface RouteCtx {
  params: Promise<{ quotationId: string }>;
}

function leanToDraft(q: Record<string, unknown>): QuotationRenderDraft {
  const di = q.documentInfo as Record<string, unknown>;
  const ci = q.quotationInfo as Record<string, unknown> | undefined;
  const pagesRaw = q.pages as Array<{
    pageNumber: number;
    items: Array<Record<string, unknown>>;
  }>;
  const totals = q.totals as Record<string, unknown>;
  const branding = (q.branding ?? {}) as QuotationRenderDraft["branding"];

  const documentInfo: QuotationRenderDraft["documentInfo"] = {
    quotationCode: String(di?.quotationCode ?? "").trim() || undefined,
    geCode: String(di?.geCode ?? "").trim() || undefined,
    date: new Date(String(di?.date ?? "")).toISOString(),
    subject: String(di?.subject ?? ""),
    title: String(di?.title ?? ""),
    description: String(di?.description ?? ""),
    taxRate: Number(di?.taxRate ?? 0),
    taxEnabled: Boolean(di?.taxEnabled),
  };

  return {
    quotationNumberLabel: String(q.quotationNumber ?? ""),
    status: String(q.status ?? ""),
    documentInfo,
    clientSnapshot: q.clientSnapshot as QuotationRenderDraft["clientSnapshot"],
    companySnapshot: q.companySnapshot as QuotationRenderDraft["companySnapshot"],
    pages: pagesRaw.map((p) => ({
      pageNumber: p.pageNumber,
      items: p.items.map((item) => ({
        number: Number(item.number),
        name: String(item.name),
        quantity: Number(item.quantity),
        price: decimalToNumber(item.price),
      })),
    })),
    totals: {
      subtotal: decimalToNumber(totals.subtotal),
      tax: decimalToNumber(totals.tax),
      total: decimalToNumber(totals.total),
    },
    quotationInfo: {
      leadTime: ci?.leadTime !== undefined ? String(ci.leadTime) : undefined,
      terms: ci?.terms !== undefined ? String(ci.terms) : undefined,
      validity: ci?.validity !== undefined ? String(ci.validity) : undefined,
      remainingText: ci?.remainingText !== undefined ? String(ci.remainingText) : undefined,
      confirmDate:
        ci?.confirmDate !== undefined && ci?.confirmDate !== null
          ? new Date(String(ci.confirmDate)).toISOString()
          : undefined,
    },
    branding,
  };
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const { quotationId } = await ctx.params;
    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessQuotation(session.user.id, quotationId);
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        if (e instanceof Error && e.message === "NOT_FOUND") {
          return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
        }
        throw e;
      }
    }
    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "docx" ? "docx" : "pdf";

    const raw = await QuotationModel.findById(quotationId).lean();
    if (!raw) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }

    const draft = leanToDraft(raw as Record<string, unknown>);

    if (format === "pdf") {
      const buf = await renderQuotationPdf(draft);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="quotation-${draft.quotationNumberLabel ?? quotationId}.pdf"`,
        },
      });
    }

    const buf = await renderQuotationDocx(draft);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="quotation-${draft.quotationNumberLabel ?? quotationId}.docx"`,
      },
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to export document");
  }
}
