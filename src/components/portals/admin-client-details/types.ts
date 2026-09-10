export type ClientDetailsPayload = {
  client?: {
    _id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    website?: string;
    address?: string;
    clientLogoText?: string;
    clientLogoUrl?: string;
    clientSignatureText?: string;
    taxId?: string;
    currency?: string;
    paymentTerms?: string;
    notes?: string;
    billingAddress?: string;
    shippingAddress?: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    createdAt: string;
  };
  projects?: Array<{
    _id: string;
    name: string;
    status: string;
    priority: string;
    createdAt: string;
    /** Sum of expense amounts for this project (AED). */
    expenseTotal?: number;
  }>;
  quotations?: Array<{
    _id: string;
    quotationNumber: string;
    status: string;
    projectId: string;
    createdAt: string;
  }>;
  purchaseOrders?: Array<{
    _id: string;
    poNumber: string;
    type: string;
    status: string;
    projectId: string;
    createdAt: string;
  }>;
  invoices?: Array<{
    _id: string;
    invoiceNumber: string;
    status: string;
    dueDate?: string;
    projectId: string;
    createdAt: string;
  }>;
  expenses?: Array<{
    _id: string;
    title: string;
    amount: number;
    category: string;
    projectId: string;
    projectName: string;
    createdAt: string;
  }>;
  /** Sum of all expense amounts across this client’s projects (AED). */
  expenseTotalAll?: number;
  message?: string;
};

export type ClientProfileForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  clientLogoText: string;
  clientSignatureText: string;
  taxId: string;
  currency: string;
  paymentTerms: string;
  notes: string;
  billingAddress: string;
  shippingAddress: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
};
