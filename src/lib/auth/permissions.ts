export type ResourceAction =
  | "projects.view"
  | "projects.create"
  | "projects.edit"
  | "projects.delete"
  | "quotations.view"
  | "quotations.create"
  | "quotations.edit"
  | "quotations.delete"
  | "quotations.approve"
  | "quotations.send"
  | "invoices.view"
  | "invoices.create"
  | "invoices.edit"
  | "invoices.delete"
  | "invoices.approve"
  | "purchaseOrders.view"
  | "purchaseOrders.create"
  | "purchaseOrders.edit"
  | "purchaseOrders.delete"
  | "payments.view"
  | "payments.create"
  | "expenses.view"
  | "expenses.create"
  | "expenses.approve"
  | "company.view"
  | "company.edit"
  | "companyHierarchy.view"
  | "companyHierarchy.manage"
  | "groupView.access"
  | "users.view"
  | "users.manage";

export const DEFAULT_ROLE_PERMISSIONS: Record<"admin" | "employee", ResourceAction[]> = {
  admin: [
    "projects.view", "projects.create", "projects.edit", "projects.delete",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.approve", "quotations.send",
    "invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.approve",
    "purchaseOrders.view", "purchaseOrders.create", "purchaseOrders.edit", "purchaseOrders.delete",
    "payments.view", "payments.create",
    "expenses.view", "expenses.create", "expenses.approve",
    "company.view", "company.edit",
    "companyHierarchy.view", "companyHierarchy.manage",
    "groupView.access",
    "users.view", "users.manage",
  ],
  employee: [
    "projects.view",
    "quotations.view", "quotations.create",
    "invoices.view",
    "purchaseOrders.view",
    "expenses.view", "expenses.create",
    "company.view",
  ],
};

export function hasPermissionForRole(
  role: string,
  permission: ResourceAction,
  customPermissions?: ResourceAction[]
): boolean {
  if (customPermissions && Array.isArray(customPermissions)) {
    return customPermissions.includes(permission);
  }
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role as "admin" | "employee"] || [];
  return defaultPerms.includes(permission);
}
