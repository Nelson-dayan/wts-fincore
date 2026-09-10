export type Bank = {
  accountName?: string;
  accountNo?: string;
  iban?: string;
  bankName?: string;
  swift?: string;
};

export type Item = {
  _id?: string;
  invoiceNumber: string;
  companyId?: string;
  currency?: string;
  exchangeRate?: number;
  invoiceType?: "aed" | "usd";
  projectId: string;
  poId: string;
  status: string;
  fixCurrency?: boolean;
  documentInfo: {
    date?: string;
    title?: string;
    subject?: string;
    taxRate?: number;
    taxEnabled?: boolean;
  };
  clientSnapshot: Record<string, string | undefined>;
  companySnapshot: Record<string, string | undefined>;
  pages: Array<{
    pageNumber: number;
    items: Array<{
      number: number;
      name: string;
      description: string;
      quantity: number;
      price: number;
    }>;
  }>;
  totals: { subtotal: number; tax: number; total: number };
  extras: Record<string, unknown>;
  dueDate: string;
  createdAt?: string;
  branding?: Record<string, unknown>;
  totalsCache?: {
    totalReceivedBase: number;
    totalFeesBase: number;
    totalIntendedBase: number;
    overpaidAmountBase: number;
  };
};
