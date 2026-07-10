import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";
import { renderQuotationDocx } from "@/lib/services/business/quotation-render-docx";
import { renderQuotationPdf } from "@/lib/services/business/quotation-render-pdf";

export async function POST(req: Request) {
  try {
    await requireRole(["admin"]);
    let body: { format?: "pdf" | "docx"; draft?: QuotationRenderDraft };
    try {
      body = (await req.json()) as { format?: "pdf" | "docx"; draft?: QuotationRenderDraft };
    } catch {
      return NextResponse.json(
        {
          message:
            "Request body was too large or invalid. Remove or shrink pasted images in logo/signature fields for preview.",
        },
        { status: 413 }
      );
    }
    const format = body.format === "docx" ? "docx" : "pdf";
    if (!body.draft) {
      return NextResponse.json({ message: "draft is required" }, { status: 400 });
    }

    if (format === "pdf") {
      const buf = await renderQuotationPdf(body.draft);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
          "Content-Disposition": 'inline; filename="quotation-preview.pdf"',
        },
      });
    }

    const buf = await renderQuotationDocx(body.draft);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="quotation.docx"',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    console.error("[quotations/render]", error);
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "Failed to render document";
    const safe = msg.length > 500 ? `${msg.slice(0, 497)}…` : msg;
    return NextResponse.json({ message: safe }, { status: 500 });
  }
}
