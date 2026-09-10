export type ClientRow = {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  clientLogoText?: string;
  clientSignatureText?: string;
  projectsCount?: number;
  createdAt: string;
};

export type ClientForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  clientLogoText: string;
  clientSignatureText: string;
};
