export const USER_ROLES = ["super_admin", "admin", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_ROLE: UserRole = "employee";

