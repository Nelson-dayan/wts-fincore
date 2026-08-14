/**
 * Standardized Document Reference Generator for Sec-DocuTrade ERP
 * Standard format: [DOC_TYPE]-[COMPANY_CODE]-[YYMMDD]-[SEQUENCE]-[HASH]
 * Examples:
 * - Quotation: QT-HOLD-260814-001-K9X
 * - Invoice:   INV-HOLD-260814-001-K9X
 * - Purchase Order: PO-HOLD-260814-001-K9X
 */

export function generateRandomSuffix(length = 3): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function resolveCompanyCode(comp: any, docType: string = "QT"): string {
  if (!comp) return "SDT";
  
  const prefixKey = docType === "INV" ? "invoicePrefix" : docType === "PO" ? "poPrefix" : "quotationPrefix";
  const rawPrefix = comp.branding?.[prefixKey] || comp?.[prefixKey];
  if (rawPrefix && typeof rawPrefix === "string" && rawPrefix.trim().length > 0) {
    const cleaned = rawPrefix
      .replace(new RegExp(`^${docType}[-_:]?`, "i"), "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 5);
    if (cleaned.length > 0) return cleaned;
  }

  const code = comp?.code;
  if (code && typeof code === "string" && code.trim().length > 0) {
    return code.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5);
  }

  return "SDT";
}

export function generateStandardDocumentRef(options: {
  docType: "QT" | "INV" | "PO";
  companyCode?: string;
  company?: any;
  sequence?: number;
  date?: Date;
  customSuffix?: string;
}): string {
  const { docType, companyCode, company, sequence = 1, date = new Date(), customSuffix } = options;
  const compCode = companyCode 
    ? companyCode.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5) 
    : resolveCompanyCode(company, docType);
    
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;
  const seqStr = String(sequence).padStart(3, "0");
  const hash = customSuffix || generateRandomSuffix(3);

  return `${docType}-${compCode}-${dateStr}-${seqStr}-${hash}`;
}
