import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { QuotationRenderDraft } from "@/lib/services/business/quotation-render.types";
import { quotationCodeFromDocumentInfo } from "@/lib/services/business/quotation-render.types";
import {
  defaultQuotationBranding,
  resolveClientSignatureSrc,
  resolveCompanySignatureSrc,
  resolveQuotationLogoSrc,
  type QuotationBrandingState,
} from "@/lib/portals/quotation-preview-utils";
import { normalizeQuotationRenderDraft } from "@/lib/services/business/quotation-render-normalize";

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString();
}

function brandingState(d: QuotationRenderDraft): QuotationBrandingState {
  return {
    ...defaultQuotationBranding(),
    ...d.branding,
  };
}

export async function renderQuotationDocx(input: QuotationRenderDraft): Promise<Buffer> {
  const draft = normalizeQuotationRenderDraft(input);
  const b = brandingState(draft);
  const logoNote =
    resolveQuotationLogoSrc(b, draft.companySnapshot) !== null
      ? "[Logo image omitted in Word export — use PDF for embedded images]"
      : "";

  const qc = quotationCodeFromDocumentInfo(draft.documentInfo);

  const headerChildren: Paragraph[] = [];
  if (logoNote) {
    headerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: logoNote, italics: true })],
      })
    );
  }

  for (const line of [
    draft.companySnapshot.address,
    draft.companySnapshot.email,
    draft.companySnapshot.website,
  ].filter(Boolean)) {
    headerChildren.push(new Paragraph({ text: line }));
  }

  headerChildren.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "QUOTATION", heading: HeadingLevel.HEADING_1 }),
    new Paragraph(draft.quotationNumberLabel ?? "—")
  );
  if (draft.status) {
    headerChildren.push(new Paragraph(`Status: ${draft.status}`));
  }
  if (qc) {
    headerChildren.push(new Paragraph(`Quotation code: ${qc}`));
  }
  headerChildren.push(new Paragraph(`Date: ${fmtDate(draft.documentInfo.date)}`));
  headerChildren.push(new Paragraph({ text: "" }));

  headerChildren.push(
    new Paragraph({ text: "Bill to", heading: HeadingLevel.HEADING_2 }),
    new Paragraph(draft.clientSnapshot.name)
  );
  if (draft.clientSnapshot.company) {
    headerChildren.push(new Paragraph(draft.clientSnapshot.company));
  }
  if (draft.clientSnapshot.address) {
    headerChildren.push(new Paragraph(draft.clientSnapshot.address));
  }

  headerChildren.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Subject & summary", heading: HeadingLevel.HEADING_2 })
  );
  if (draft.documentInfo.subject) {
    headerChildren.push(new Paragraph(draft.documentInfo.subject));
  }
  if (draft.documentInfo.title) {
    headerChildren.push(new Paragraph(draft.documentInfo.title));
  }
  if (draft.documentInfo.description) {
    headerChildren.push(new Paragraph(draft.documentInfo.description));
  }

  const tableRows: TableRow[] = [
    new TableRow({
      children: ["#", "Description", "Qty", "Price", "Line total"].map(
        (h) =>
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
          })
      ),
    }),
  ];

  for (const page of draft.pages) {
    for (const item of page.items) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              children: [new Paragraph(String(item.number))],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [new Paragraph(item.name)],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              children: [new Paragraph(String(item.quantity))],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              children: [new Paragraph(fmtMoney(item.price))],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              children: [new Paragraph(fmtMoney(item.quantity * item.price))],
            }),
          ],
        })
      );
    }
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const tail: Paragraph[] = [
    new Paragraph({ text: "" }),
    new Paragraph(`Subtotal: ${fmtMoney(draft.totals.subtotal)}`),
  ];
  if (draft.documentInfo.taxEnabled) {
    tail.push(
      new Paragraph(
        `Tax (${draft.documentInfo.taxRate ?? 0}%): ${fmtMoney(draft.totals.tax)}`
      )
    );
  }
  tail.push(
    new Paragraph({
      children: [new TextRun({ text: `Total: ${fmtMoney(draft.totals.total)}`, bold: true })],
    })
  );

  const qi = draft.quotationInfo;
  if (qi.leadTime) tail.push(new Paragraph(`Lead time: ${qi.leadTime}`));
  if (qi.validity) tail.push(new Paragraph(`Validity: ${qi.validity}`));
  if (qi.confirmDate) tail.push(new Paragraph(`Confirm by: ${fmtDate(qi.confirmDate)}`));
  if (qi.remainingText) tail.push(new Paragraph(`Note: ${qi.remainingText}`));
  if (qi.terms) {
    tail.push(
      new Paragraph({ text: "Terms & conditions", heading: HeadingLevel.HEADING_2 }),
      new Paragraph(qi.terms)
    );
  }

  const companySig = resolveCompanySignatureSrc(b, draft.companySnapshot);
  const clientSig = resolveClientSignatureSrc(b, draft.clientSnapshot);
  if (companySig) {
    tail.push(
      new Paragraph({ text: "Authorized signature", heading: HeadingLevel.HEADING_3 }),
      new Paragraph("[Signature image — see PDF export]")
    );
  }
  if (clientSig) {
    tail.push(
      new Paragraph({ text: "Client acknowledgement", heading: HeadingLevel.HEADING_3 }),
      new Paragraph("[Signature image — see PDF export]")
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...headerChildren, table, ...tail],
      },
    ],
  });

  const out = await Packer.toBuffer(doc);
  return Buffer.from(out);
}
