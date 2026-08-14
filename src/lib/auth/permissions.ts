export type ResourceAction =
  | "projects.view"
  | "projects.create"
  | "projects.edit"
  | "projects.delete"
  | "quotations.view"
  | "quotations.create"
  | "quotations.edit"
  | "quotations.delete"
  | "quotations.send"
  | "quotations.approve"
  | "quotations.reject"
  | "quotations.convert"
  | "invoices.view"
  | "invoices.create"
  | "invoices.edit"
  | "invoices.delete"
  | "invoices.issue"
  | "invoices.send"
  | "invoices.void"
  | "invoices.markPaid"
  | "purchaseOrders.view"
  | "purchaseOrders.create"
  | "purchaseOrders.edit"
  | "purchaseOrders.delete"
  | "purchaseOrders.send"
  | "purchaseOrders.approve"
  | "purchaseOrders.cancel"
  | "payments.view"
  | "payments.create"
  | "expenses.view"
  | "expenses.create"
  | "expenses.approve"
  | "expenses.reject"
  | "company.view"
  | "company.edit"
  | "companyHierarchy.view"
  | "companyHierarchy.manage"
  | "groupView.access"
  | "users.view"
  | "users.manage";

export const DEFAULT_ROLE_PERMISSIONS: Record<"super_admin" | "admin" | "employee", ResourceAction[]> = {
  super_admin: [
    "projects.view", "projects.create", "projects.edit", "projects.delete",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.send", "quotations.approve", "quotations.reject", "quotations.convert",
    "invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.issue", "invoices.send", "invoices.void", "invoices.markPaid",
    "purchaseOrders.view", "purchaseOrders.create", "purchaseOrders.edit", "purchaseOrders.delete", "purchaseOrders.send", "purchaseOrders.approve", "purchaseOrders.cancel",
    "payments.view", "payments.create",
    "expenses.view", "expenses.create", "expenses.approve", "expenses.reject",
    "company.view", "company.edit",
    "companyHierarchy.view", "companyHierarchy.manage",
    "groupView.access",
    "users.view", "users.manage",
  ],
  admin: [
    "projects.view", "projects.create", "projects.edit", "projects.delete",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.send", "quotations.approve", "quotations.reject", "quotations.convert",
    "invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.issue", "invoices.send", "invoices.void", "invoices.markPaid",
    "purchaseOrders.view", "purchaseOrders.create", "purchaseOrders.edit", "purchaseOrders.delete", "purchaseOrders.send", "purchaseOrders.approve", "purchaseOrders.cancel",
    "payments.view", "payments.create",
    "expenses.view", "expenses.create", "expenses.approve", "expenses.reject",
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
  if (role === "super_admin") {
    return true;
  }
  if (customPermissions && Array.isArray(customPermissions)) {
    return customPermissions.includes(permission);
  }
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role as "super_admin" | "admin" | "employee"] || [];
  return defaultPerms.includes(permission);
}

