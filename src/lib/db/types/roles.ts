export const USER_ROLES = ["admin", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_ROLE: UserRole = "employee";
