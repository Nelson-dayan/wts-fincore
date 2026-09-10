import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { UserModel, CompanyModel } from "@/lib/db/models";
import { CompanyHierarchyService } from "@/lib/services/business/company-hierarchy.service";

export interface UserAccessInfo {
  isSuperAdmin: boolean;
  assignedCompanyIds: string[];
  allowedCompanyIds: string[];
  defaultCompanyId: string | null;
}

/**
 * Resolves all company IDs a given user is allowed to access.
 * For Super Admin: returns ALL active company IDs.
 * For standard users: returns company IDs from companyMemberships (plus descendant companies if group view is enabled).
 */
export async function getUserAccessInfo(
  userId: string,
  userRole?: string
): Promise<UserAccessInfo> {
  await connectDB();

  const isSuperAdmin = userRole === "super_admin";

  const allActiveCompanies = await CompanyModel.find({ isActive: true, deletedAt: null })
    .select("_id")
    .lean();
  const allActiveCompanyIdsStr = allActiveCompanies.map((c) => c._id.toString());

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      assignedCompanyIds: allActiveCompanyIdsStr,
      allowedCompanyIds: allActiveCompanyIdsStr,
      defaultCompanyId: allActiveCompanyIdsStr[0] || null,
    };
  }

  const userDoc = await UserModel.findById(userId)
    .select("role companyMemberships defaultCompanyId")
    .lean();

  if (!userDoc) {
    return {
      isSuperAdmin: false,
      assignedCompanyIds: [],
      allowedCompanyIds: [],
      defaultCompanyId: null,
    };
  }

  if (userDoc.role === "super_admin") {
    return {
      isSuperAdmin: true,
      assignedCompanyIds: allActiveCompanyIdsStr,
      allowedCompanyIds: allActiveCompanyIdsStr,
      defaultCompanyId: userDoc.defaultCompanyId
        ? userDoc.defaultCompanyId.toString()
        : allActiveCompanyIdsStr[0] || null,
    };
  }

  const memberships = userDoc.companyMemberships || [];
  const assignedIdsSet = new Set<string>();

  memberships.forEach((m: { companyId?: Types.ObjectId | string }) => {
    if (m.companyId) {
      assignedIdsSet.add(m.companyId.toString());
    }
  });

  if (userDoc.defaultCompanyId) {
    assignedIdsSet.add(userDoc.defaultCompanyId.toString());
  }

  let assignedCompanyIds = Array.from(assignedIdsSet);

  // Fallback for legacy unassigned users: assign primary/first company only, never all active companies
  if (assignedCompanyIds.length === 0) {
    if (userDoc.defaultCompanyId) {
      assignedCompanyIds = [userDoc.defaultCompanyId.toString()];
    } else if (allActiveCompanyIdsStr.length > 0) {
      assignedCompanyIds = [allActiveCompanyIdsStr[0]];
    }
  }

  return {
    isSuperAdmin: false,
    assignedCompanyIds,
    allowedCompanyIds: assignedCompanyIds,
    defaultCompanyId: userDoc.defaultCompanyId
      ? userDoc.defaultCompanyId.toString()
      : assignedCompanyIds[0] || null,
  };
}

/**
 * Checks whether a user has access to a specific company ID.
 */
export async function canUserAccessCompany(
  userId: string,
  companyIdStr: string,
  userRole?: string
): Promise<boolean> {
  if (userRole === "super_admin") return true;

  const access = await getUserAccessInfo(userId, userRole);
  if (access.isSuperAdmin) return true;

  return access.assignedCompanyIds.includes(companyIdStr);
}
