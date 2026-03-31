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
    createdAt: string;
  };
  projects?: Array<{
    _id: string;
    name: string;
    status: string;
    priority: string;
    createdAt: string;
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
};
