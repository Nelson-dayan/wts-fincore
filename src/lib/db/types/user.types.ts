import type { Types } from "mongoose";
import type { UserRole } from "./roles";

export interface ICompanyMembership {
  companyId: Types.ObjectId;
  role: "group_admin" | "company_admin" | "manager" | "accountant" | "employee" | "viewer";
  permissions?: string[];
  isDefault?: boolean;
  joinedAt?: Date;
  expiresAt?: Date | null;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  phoneNumber?: string;
  isActive: boolean;
  signatureUrl?: string;
  companyMemberships?: ICompanyMembership[];
  defaultCompanyId?: Types.ObjectId | null;
  companyIds?: Types.ObjectId[];
  primaryCompanyId?: Types.ObjectId | null;
  groupIds?: Types.ObjectId[];
  groupViewAccess?: boolean;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
