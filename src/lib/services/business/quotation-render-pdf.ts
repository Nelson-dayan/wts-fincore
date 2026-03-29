import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";
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

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const BOTTOM_SAFE = MARGIN + 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Professional quotation palette (print-friendly) */
const T = {
  accent: "#0c4a6e",
  accentMuted: "#e0f2fe",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  tableHeader: "#f1f5f9",
  rowAlt: "#f8fafc",
  text: "#0f172a",
  textMuted: "#475569",
  white: "#ffffff",
};

const MAX_EMBED_IMAGE_BYTES = 8 * 1024 * 1024;
const REMOTE_IMAGE_FETCH_MS = 12_000;

function pdfKitSafeImageBuffer(dataUrl: string): Buffer | null {
  const s = dataUrl.trim();
  if (!s.startsWith("data:image/")) return null;
  const headEnd = s.indexOf(";");
  const head = (headEnd === -1 ? s : s.slice(0, headEnd)).toLowerCase();
  const allowed =
    head.includes("image/jpeg") ||
    head.includes("image/jpg") ||
    head.includes("image/png") ||
    head.includes("image/gif");
  if (!allowed) return null;
  const idx = s.indexOf("base64,");
  if (idx === -1) return null;
  const b64 = s.slice(idx + 7).replace(/\s/g, "");
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length > MAX_EMBED_IMAGE_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

/** PDFKit embeds JPEG/PNG only (see pdfkit `openImage`). */
function bufferLooksLikePdfKitRaster(buf: Buffer): boolean {
  if (buf.length < 3) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.length >= 4 && buf[0] === 0x89 && buf.slice(1, 4).toString("ascii") === "PNG") return true;
  return false;
}

function isBlockedHostnameForSsrf(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0") return true;
  if (h.endsWith(".localhost") || h === "local") return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const a = +ipv4[1];
    const b = +ipv4[2];
    const c = +ipv4[3];
    const d = +ipv4[4];
    if ([a, b, c, d].some((x) => x > 255)) return true;
    if (a === 0 || a === 127) return true;
    if (a === 10) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (h.includes(":")) {
    if (h === "::1") return true;
    if (h.startsWith("fe80:")) return true;
    if (h.startsWith("fc") || h.startsWith("fd")) return true;
    const tail = h.includes("::ffff:") ? h.split("::ffff:")[1] : null;
    if (tail && isBlockedHostnameForSsrf(tail)) return true;
  }
  return false;
}

async function fetchRemoteImageBufferForPdf(url: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (process.env.NODE_ENV === "production" && parsed.protocol === "http:") return null;
  if (isBlockedHostnameForSsrf(parsed.hostname)) return null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REMOTE_IMAGE_FETCH_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: { Accept: "image/*,*/*;q=0.1" },
    });
    if (!res.ok) return null;
    const cl = res.headers.get("content-length");
    if (cl && Number(cl) > MAX_EMBED_IMAGE_BYTES) return null;
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (
      ct &&
      ct !== "application/octet-stream" &&
      !ct.startsWith("image/")
    ) {
      return null;
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_EMBED_IMAGE_BYTES) return null;
    const buf = Buffer.from(ab);
    if (!bufferLooksLikePdfKitRaster(buf)) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveImageBufferForPdf(src: string): Promise<Buffer | null> {
  const s = String(src ?? "").trim();
  if (!s) return null;
  if (s.startsWith("data:image/")) return pdfKitSafeImageBuffer(s);
  if (/^https?:\/\//i.test(s)) return fetchRemoteImageBufferForPdf(s);
  return null;
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function wrapWords(text: string, maxChars: number): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function brandingState(d: QuotationRenderDraft): QuotationBrandingState {
  return {
    ...defaultQuotationBranding(),
    ...d.branding,
  };
}

type Doc = InstanceType<typeof PDFDocument>;

function drawRoundedPanel(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke: string
) {
  doc.save();
  doc.fillColor(fill).strokeColor(stroke).lineWidth(0.6);
  doc.roundedRect(x, y, w, h, r).fillAndStroke();
  doc.restore();
}

function drawAccentTitleBar(doc: Doc, x: number, y: number, w: number, title: string) {
  const barH = 22;
  doc.save();
  doc.rect(x, y, 4, barH).fill(T.accent);
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(10);
  doc.text(title, x + 12, y + 5, { width: w - 16 });
  doc.restore();
}

export async function renderQuotationPdf(input: QuotationRenderDraft): Promise<Buffer> {
  const draft = normalizeQuotationRenderDraft(input);
  const titleMeta = String(draft.quotationNumberLabel ?? "Quotation").slice(0, 200);
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margin: MARGIN,
    info: {
      Title: titleMeta,
    },
  });

  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.on("error", reject);
  });
  doc.pipe(stream);

  const b = brandingState(draft);
  const logoSrc = resolveQuotationLogoSrc(b, draft.companySnapshot);
  const companySig = resolveCompanySignatureSrc(b, draft.companySnapshot);
  const clientSig = resolveClientSignatureSrc(b, draft.clientSnapshot);
  const clientLogoSrc =
    String(draft.clientSnapshot.logoText ?? "").trim() || null;

  const [logoBuf, companySigBuf, clientSigBuf, clientLogoBuf] = await Promise.all([
    logoSrc ? resolveImageBufferForPdf(logoSrc) : Promise.resolve(null),
    companySig ? resolveImageBufferForPdf(companySig) : Promise.resolve(null),
    clientSig ? resolveImageBufferForPdf(clientSig) : Promise.resolve(null),
    clientLogoSrc ? resolveImageBufferForPdf(clientLogoSrc) : Promise.resolve(null),
  ]);

  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - BOTTOM_SAFE) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const panelGap = 12;
  const metaW = 218;
  const metaX = PAGE_W - MARGIN - metaW;
  const leftContentW = metaX - MARGIN - panelGap;

  /* —— Top brand bar —— */
  doc.save();
  doc.rect(0, 0, PAGE_W, 5).fill(T.accent);
  doc.restore();
  y = MARGIN + 2;

  /* —— Logo + address (single left card) | Meta (right) —— */
  const headerStartY = y;
  let leftBlockBottom = y;

  const logoInnerPad = 14;
  const addrFontSize = 9.5;
  const logoFitW = Math.min(leftContentW - logoInnerPad * 2, 200);
  const logoFitH = 52;
  const logoToAddrGap = 8;

  const addr = [
    draft.companySnapshot.address,
    draft.companySnapshot.email,
    draft.companySnapshot.website,
  ].filter(Boolean) as string[];

  const addrTextW = leftContentW - logoInnerPad * 2;
  doc.save();
  doc.font("Helvetica").fontSize(addrFontSize);
  let addrBlockH = 0;
  for (let i = 0; i < addr.length; i++) {
    const line = addr[i];
    addrBlockH += doc.heightOfString(line, { width: addrTextW, lineGap: 1 });
    if (i < addr.length - 1) addrBlockH += 2;
  }
  doc.restore();

  const canDrawLogo = Boolean(logoSrc && logoBuf);
  let innerH = 0;
  if (canDrawLogo) innerH += logoFitH;
  if (addr.length) {
    if (canDrawLogo) innerH += logoToAddrGap;
    innerH += addrBlockH;
  }
  if (innerH < 1) innerH = 24;

  const companyPanelNaturalH = logoInnerPad + innerH + logoInnerPad;

  /* Right meta: natural content height (for equal-height row) */
  const qc = quotationCodeFromDocumentInfo(draft.documentInfo);
  const metaPad = 14;
  const metaInnerW = metaW - 28;
  doc.save();
  let metaNaturalH = metaPad;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(T.accent);
  metaNaturalH += doc.heightOfString("QUOTATION", { width: metaInnerW, align: "right" });
  metaNaturalH += 4;
  doc.fillColor(T.text).fontSize(13);
  metaNaturalH += doc.heightOfString(draft.quotationNumberLabel ?? "—", {
    width: metaInnerW,
    align: "right",
  });
  metaNaturalH += 10;
  doc.font("Helvetica").fontSize(8.5).fillColor(T.textMuted);
  if (draft.status) {
    metaNaturalH +=
      doc.heightOfString(`Status · ${draft.status}`, { width: metaInnerW, align: "right" }) + 2;
  }
  if (qc) {
    metaNaturalH += doc.heightOfString(`Ref · ${qc}`, { width: metaInnerW, align: "right" }) + 2;
  }
  metaNaturalH += doc.heightOfString(`Date · ${fmtDate(draft.documentInfo.date)}`, {
    width: metaInnerW,
    align: "right",
  });
  metaNaturalH += metaPad;
  doc.restore();

  const headerCardH = Math.max(companyPanelNaturalH, metaNaturalH);

  drawRoundedPanel(doc, MARGIN, y, leftContentW, headerCardH, 8, "#f8fafc", T.borderLight);

  let contentY = y + logoInnerPad;
  if (canDrawLogo) {
    try {
      doc.image(logoBuf!, MARGIN + logoInnerPad, contentY, {
        fit: [logoFitW, logoFitH],
        align: "center",
        valign: "center",
      });
    } catch {
      /* Logo failed to decode */
    }
    contentY += logoFitH + (addr.length ? logoToAddrGap : 0);
  }
  if (addr.length) {
    doc.fillColor(T.textMuted).font("Helvetica").fontSize(addrFontSize);
    let addrY = contentY;
    for (const line of addr) {
      doc.text(line, MARGIN + logoInnerPad, addrY, { width: addrTextW, lineGap: 1 });
      addrY = doc.y + 2;
    }
  }

  leftBlockBottom = y + headerCardH + 8;

  /* Right: quotation meta card (same height as left) */
  let ry = headerStartY;
  drawRoundedPanel(doc, metaX, ry, metaW, headerCardH, 8, T.accentMuted, T.border);

  doc.fillColor(T.accent).font("Helvetica-Bold").fontSize(9);
  doc.text("QUOTATION", metaX + 14, ry + 12, { width: metaW - 28, align: "right" });
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(13);
  doc.text(draft.quotationNumberLabel ?? "—", metaX + 14, ry + 26, {
    width: metaW - 28,
    align: "right",
  });
  doc.font("Helvetica").fontSize(8.5).fillColor(T.textMuted);
  let my = ry + 48;
  if (draft.status) {
    doc.text(`Status · ${draft.status}`, metaX + 14, my, { width: metaW - 28, align: "right" });
    my += 12;
  }
  if (qc) {
    doc.text(`Ref · ${qc}`, metaX + 14, my, { width: metaW - 28, align: "right" });
    my += 12;
  }
  doc.fillColor(T.textMuted).text(
    `Date · ${fmtDate(draft.documentInfo.date)}`,
    metaX + 14,
    my,
    { width: metaW - 28, align: "right" }
  );

  y = Math.max(leftBlockBottom, ry + headerCardH + 14);

  /* —— Bill to | Subject —— */
  ensureSpace(140);
  const colGap = 14;
  const colW = (CONTENT_W - colGap) / 2;
  const boxY = y;
  const leftBoxX = MARGIN;
  const rightBoxX = MARGIN + colW + colGap;

  const subjH = 108;
  const hasClientLogo = Boolean(clientLogoBuf);
  const billH = hasClientLogo ? 132 : 108;
  drawRoundedPanel(doc, leftBoxX, boxY, colW, billH, 6, T.white, T.border);
  drawAccentTitleBar(doc, leftBoxX, boxY, colW, "Bill to");
  let billTextY = boxY + 28;
  if (clientLogoBuf) {
    try {
      doc.image(clientLogoBuf, leftBoxX + 14, billTextY, {
        fit: [Math.min(colW - 28, 100), 40],
        valign: "center",
      });
      billTextY += 44;
    } catch {
      /* skip broken client logo */
    }
  }
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(10);
  doc.text(draft.clientSnapshot.name, leftBoxX + 14, billTextY, { width: colW - 28 });
  doc.font("Helvetica").fontSize(9).fillColor(T.textMuted);
  if (draft.clientSnapshot.company) {
    doc.text(draft.clientSnapshot.company, leftBoxX + 14, doc.y + 2, { width: colW - 28 });
  }
  if (draft.clientSnapshot.address) {
    doc.text(draft.clientSnapshot.address, leftBoxX + 14, doc.y + 4, { width: colW - 28 });
  }

  drawRoundedPanel(doc, rightBoxX, boxY, colW, subjH, 6, T.white, T.border);
  drawAccentTitleBar(doc, rightBoxX, boxY, colW, "Subject & summary");
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(10);
  let sy = boxY + 30;
  if (draft.documentInfo.subject) {
    doc.text(draft.documentInfo.subject, rightBoxX + 14, sy, { width: colW - 28 });
    sy = doc.y + 4;
  }
  doc.font("Helvetica").fontSize(9).fillColor(T.textMuted);
  if (draft.documentInfo.title) {
    doc.text(draft.documentInfo.title, rightBoxX + 14, sy, { width: colW - 28 });
    sy = doc.y + 4;
  }
  if (draft.documentInfo.description) {
    doc.text(draft.documentInfo.description, rightBoxX + 14, sy, { width: colW - 28 });
  }

  y = boxY + Math.max(billH, subjH) + 18;

  /* —— Line items table —— */
  const col = {
    n: MARGIN + 8,
    desc: MARGIN + 36,
    qty: PAGE_W - MARGIN - 188,
    price: PAGE_W - MARGIN - 128,
    tot: PAGE_W - MARGIN - 58,
  };
  const descW = col.qty - col.desc - 10;
  const lineH = 11.5;
  const tablePad = 8;

  ensureSpace(40);
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(11);
  doc.text("Line items", MARGIN, y);
  y = doc.y + 8;

  const tableTop = y;
  const headH = 24;
  doc.save();
  doc.fillColor(T.tableHeader).roundedRect(MARGIN, tableTop, CONTENT_W, headH, 6).fill();
  doc.strokeColor(T.border).lineWidth(0.5);
  doc.roundedRect(MARGIN, tableTop, CONTENT_W, headH, 6).stroke();
  doc.fillColor(T.text).font("Helvetica-Bold").fontSize(9);
  doc.text("#", col.n, tableTop + 8, { width: 22 });
  doc.text("Description", col.desc, tableTop + 8);
  doc.text("Qty", col.qty, tableTop + 8, { width: 42, align: "right" });
  doc.text("Unit price", col.price, tableTop + 8, { width: 58, align: "right" });
  doc.text("Line total", col.tot, tableTop + 8, { width: 58, align: "right" });
  doc.restore();
  y = tableTop + headH + 4;

  doc.font("Helvetica").fontSize(9).fillColor(T.text);
  let rowIdx = 0;
  for (const page of draft.pages) {
    for (const item of page.items) {
      const descLines = wrapWords(item.name, 48);
      const blockH = Math.max(descLines.length * lineH + tablePad * 2, 26);
      ensureSpace(blockH + 6);

      if (rowIdx % 2 === 1) {
        doc.save();
        doc.fillColor(T.rowAlt)
          .rect(MARGIN, y - 2, CONTENT_W, blockH + 4)
          .fill();
        doc.restore();
      }

      doc.fillColor(T.text).font("Helvetica").fontSize(9);
      doc.text(String(item.number), col.n, y + tablePad, { width: 22 });
      let dy = y + tablePad;
      for (const ln of descLines) {
        doc.text(ln, col.desc, dy, { width: descW });
        dy += lineH;
      }
      doc.text(String(item.quantity), col.qty, y + tablePad, { width: 42, align: "right" });
      doc.text(fmtMoney(item.price), col.price, y + tablePad, { width: 58, align: "right" });
      doc.text(fmtMoney(item.quantity * item.price), col.tot, y + tablePad, {
        width: 58,
        align: "right",
      });
      y = Math.max(dy, y + tablePad + blockH - 8) + 4;
      rowIdx += 1;
    }
  }

  doc.save();
  doc.strokeColor(T.border).lineWidth(0.5);
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke();
  doc.restore();
  y += 14;

  /* —— Totals —— */
  ensureSpace(100);
  const totBoxW = 220;
  const totBoxX = PAGE_W - MARGIN - totBoxW;
  const totBoxH = draft.documentInfo.taxEnabled ? 108 : 92;

  drawRoundedPanel(doc, totBoxX, y, totBoxW, totBoxH, 6, "#f8fafc", T.border);
  doc.fillColor(T.textMuted).font("Helvetica").fontSize(9);
  let ty = y + 12;
  doc.text(`Subtotal`, totBoxX + 14, ty, { width: totBoxW - 28 });
  doc.fillColor(T.text).text(fmtMoney(draft.totals.subtotal), totBoxX + 14, ty, {
    width: totBoxW - 28,
    align: "right",
  });
  ty += 16;
  if (draft.documentInfo.taxEnabled) {
    doc.fillColor(T.textMuted).text(
      `Tax (${draft.documentInfo.taxRate ?? 0}%)`,
      totBoxX + 14,
      ty,
      { width: totBoxW - 28 }
    );
    doc.fillColor(T.text).text(fmtMoney(draft.totals.tax), totBoxX + 14, ty, {
      width: totBoxW - 28,
      align: "right",
    });
    ty += 16;
  }
  doc.save();
  doc.fillColor(T.accent).roundedRect(totBoxX + 8, ty, totBoxW - 16, 28, 4).fill();
  doc.fillColor(T.white).font("Helvetica-Bold").fontSize(11);
  doc.text("Total", totBoxX + 18, ty + 8, { width: 90 });
  doc.text(fmtMoney(draft.totals.total), totBoxX + 18, ty + 8, {
    width: totBoxW - 36,
    align: "right",
  });
  doc.restore();
  y += totBoxH + 16;

  /* —— Notes & terms —— */
  const qi = draft.quotationInfo;
  doc.fillColor(T.text).font("Helvetica").fontSize(9);
  if (qi.leadTime) {
    ensureSpace(20);
    doc.fillColor(T.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text("Lead time", MARGIN, y);
    doc.font("Helvetica").fillColor(T.text).text(qi.leadTime, MARGIN + 72, y, { width: CONTENT_W - 72 });
    y = doc.y + 8;
  }
  if (qi.validity) {
    ensureSpace(20);
    doc.fillColor(T.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text("Validity", MARGIN, y);
    doc.font("Helvetica").fillColor(T.text).text(qi.validity, MARGIN + 72, y, { width: CONTENT_W - 72 });
    y = doc.y + 8;
  }
  if (qi.confirmDate) {
    ensureSpace(20);
    doc.fillColor(T.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text("Confirm by", MARGIN, y);
    doc.font("Helvetica").fillColor(T.text).text(fmtDate(qi.confirmDate), MARGIN + 72, y, {
      width: CONTENT_W - 72,
    });
    y = doc.y + 8;
  }
  if (qi.remainingText) {
    ensureSpace(24);
    doc.fillColor(T.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text("Note", MARGIN, y);
    doc.font("Helvetica").fillColor(T.text).text(qi.remainingText, MARGIN + 72, y, {
      width: CONTENT_W - 72,
    });
    y = doc.y + 8;
  }
  if (qi.terms) {
    ensureSpace(32);
    drawAccentTitleBar(doc, MARGIN, y, CONTENT_W, "Terms & conditions");
    y += 28;
    doc.font("Helvetica").fontSize(9).fillColor(T.textMuted);
    for (const line of wrapWords(qi.terms, 86)) {
      ensureSpace(14);
      doc.text(line, MARGIN, y, { width: CONTENT_W });
      y = doc.y + 3;
    }
  }

  /* —— Signatures (side by side when both) —— */
  y += 8;
  const sigW = (CONTENT_W - 20) / 2;
  const sigGap = 20;
  const cSigBuf = companySigBuf;
  const clSigBuf = clientSigBuf;
  if (cSigBuf || clSigBuf) {
    ensureSpace(100);
    doc.save();
    doc.strokeColor(T.borderLight).lineWidth(0.5);
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke();
    doc.restore();
    y += 14;
    const labelY = y;
    const boxY = labelY + 14;
    doc.fillColor(T.textMuted).font("Helvetica-Bold").fontSize(8);
    if (cSigBuf) {
      try {
        doc.text("Authorized signature", MARGIN, labelY);
        drawRoundedPanel(doc, MARGIN, boxY, sigW, 58, 5, "#fafafa", T.borderLight);
        doc.image(cSigBuf, MARGIN + 10, boxY + 8, {
          fit: [sigW - 20, 44],
          align: "center",
          valign: "center",
        });
      } catch {
        /* skip */
      }
    }
    if (clSigBuf) {
      try {
        const cx = MARGIN + sigW + sigGap;
        doc.text("Client acknowledgement", cx, labelY);
        drawRoundedPanel(doc, cx, boxY, sigW, 58, 5, "#fafafa", T.borderLight);
        doc.image(clSigBuf, cx + 10, boxY + 8, {
          fit: [sigW - 20, 44],
          align: "center",
          valign: "center",
        });
      } catch {
        /* skip */
      }
    }
    y = boxY + 66;
  }

  doc.end();
  return done;
}
