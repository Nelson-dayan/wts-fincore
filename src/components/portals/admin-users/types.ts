export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee" | "super_admin";
  isActive: boolean;
  phone?: string;
  companyIds?: string[];
  groupIds?: string[];
  groupViewAccess?: boolean;
  primaryCompanyId?: string;
  createdAt: string;
  updatedAt?: string;
};

export type NewUserForm = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: "admin" | "employee" | "super_admin";
  companyIds: string[];
  groupIds: string[];
  groupViewAccess: boolean;
  primaryCompanyId: string;
};
