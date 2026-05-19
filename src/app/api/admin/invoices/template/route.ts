import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel, PurchaseOrderModel, QuotationModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";
import { aedAmountInWords } from "@/lib/invoice/aed-amount-words";
import { computeInvoiceTotals } from "@/lib/invoice/invoice-totals";
import { generateUniqueInvoiceNumber } from "@/lib/services/business/invoice.service";
import { assertEmployeeCanAccessPurchaseOrder } from "@/lib/auth/employee-resource-access";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "employee"]);
    await connectDB();
    const url = new URL(req.url);
    const poId = String(url.searchParams.get("poId") ?? "").trim();
    if (!poId || !mongoose.Types.ObjectId.isValid(poId)) {
      return NextResponse.json({ message: "Valid poId is required" }, { status: 400 });
    }

    const po = await PurchaseOrderModel.findById(poId).lean();
    if (!po) return NextResponse.json({ message: "Purchase order not found" }, { status: 404 });

    const quotation = await QuotationModel.findById(po.quotationId).lean();
    if (!quotation) {
      return NextResponse.json(
        { message: "Quotation not found for this purchase order" },
        { status: 404 }
      );
    }

    const qCurrency = String(quotation.currency ?? "AED").toUpperCase();
    const urlType = url.searchParams.get("invoiceType");
    const invoiceType = urlType === "usd" ? "usd" : (urlType === "aed" ? "aed" : (qCurrency === "USD" ? "usd" : "aed"));

    if (session.user.role === "employee") {
      try {
        await assertEmployeeCanAccessPurchaseOrder(session.user.id, poId);
      } catch (e) {
        if (e instanceof Error && e.message === "FORBIDDEN") {
          return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        throw e;
      }
    }

    const primary = await CompanyModel.findOne({ isPrimary: true }).sort({ updatedAt: -1 }).lean();
    const qCompany =
      quotation.companySnapshot && typeof quotation.companySnapshot === "object"
        ? (quotation.companySnapshot as Record<string, unknown>)
        : {};
    const s = (v: unknown) => String(v ?? "").trim();
    const logoFromCompany = s(primary?.logoText);
    const logoFromQuote = s(qCompany.logoUrl);
    const companySnapshot = {
      name: s(primary?.name) || s(qCompany.name) || "Company",
      address: s(primary?.address) || s(qCompany.address),
      email: s(primary?.email) || s(qCompany.email),
      website: s(primary?.website) || s(qCompany.website),
      logoUrl: logoFromCompany || logoFromQuote,
      logoText: s(qCompany.logoText),
      signatureText: s(primary?.signatureText) || s(qCompany.signatureText),
    };

    const { invoiceNumber } = await generateUniqueInvoiceNumber(session.user.id);
    const invDate = new Date();
    const due = new Date(invDate);
    due.setUTCDate(due.getUTCDate() + 30);

    const docInfo = quotation.documentInfo as Record<string, unknown> | undefined;
    let taxRate = docInfo && typeof docInfo.taxRate === "number" ? docInfo.taxRate : 5;
    let taxEnabled = docInfo && typeof docInfo.taxEnabled === "boolean" ? docInfo.taxEnabled : true;
    if (invoiceType === "usd") {
      taxRate = 0;
      taxEnabled = false;
    }

    const pages = Array.isArray(quotation.pages) && quotation.pages.length > 0 
      ? quotation.pages.map((p: any) => ({
          pageNumber: p.pageNumber || 1,
          items: Array.isArray(p.items) ? p.items.map((it: any) => ({
            number: it.number || 1,
            name: it.name || "Item",
            description: it.description || "",
            quantity: it.quantity || 1,
            price: typeof it.price === "number" ? it.price : (it.price != null && typeof it.price === "object" ? parseFloat(it.price.toString()) : 0)
          })) : []
        }))
      : [
          {
            pageNumber: 1,
            items: [
              {
                number: 1,
                name: "Description of services / goods",
                description: "",
                quantity: 1,
                price: 0,
              },
            ],
          },
        ];
    const totals = computeInvoiceTotals(pages, taxRate, taxEnabled);
    const clientSnap =
      quotation.clientSnapshot && typeof quotation.clientSnapshot === "object"
        ? (quotation.clientSnapshot as Record<string, unknown>)
        : {};
    const clientCompany = s(clientSnap.company);
    const clientAddress = s(clientSnap.address);

    return NextResponse.json({
      item: {
        invoiceNumber,
        invoiceType,
        currency: quotation.currency ?? (invoiceType === "usd" ? "USD" : "AED"),
        projectId: String(po.projectId ?? ""),
        poId: String(po._id),
        status: "unpaid",
        documentInfo: {
          date: invDate.toISOString(),
          title: "INVOICE",
          taxRate,
          taxEnabled,
        },
        clientSnapshot: quotation.clientSnapshot ?? {},
        companySnapshot,
        pages,
        totals,
        dueDate: due.toISOString(),
        extras: {
          paymentTerms: "30 DAYS",
          companyTrn: "",
          clientTrn: "",
          shipToCompany: clientCompany,
          shipToAddress: clientAddress,
          shipToTrn: "",
          poNumberRef: String(po.poNumber ?? ""),
          bankAed: {},
          bankUsd: {},
          footerTerms: "TERM:",
          footerCurrencyLine: invoiceType === "usd" ? "CURRENCY IN USD" : "CURRENCY IN AED",
          disclaimer:
            "This is an electronically generated invoice, hence does not require signature.",
          amountInWords:
            invoiceType === "usd"
              ? `${totals.total.toFixed(2)} US Dollars Only.`
              : aedAmountInWords(totals.total),
          showBankAed: invoiceType === "aed",
          showBankUsd: invoiceType === "usd",
          hideShipping: false,
        },
        branding: {
          customLogoUrl: "",
          customSignatureUrl: "",
        },
      },
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to prepare invoice template");
  }
}
