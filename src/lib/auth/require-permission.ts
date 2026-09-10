import { authorizeResource, type AuthorizeOptions } from "./authorization";

export async function requirePermission(
  permission: AuthorizeOptions["permission"],
  extraOptions?: Omit<AuthorizeOptions, "permission">
) {
  const result = await authorizeResource({ permission, ...extraOptions });
  if (!result.authorized) {
    throw new Error(`FORBIDDEN: ${result.reason || "Unauthorized action"}`);
  }
  return result;
}
