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
  projectId: string;
  poId: string;
  status: string;
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
};
