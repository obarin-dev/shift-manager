import type { UserRole } from "@/lib/mock-auth";

export function isUserRole(value: string | undefined): value is UserRole {
  return value === "admin" || value === "manager" || value === "staff";
}

export function resolveRole(roleParam: string | undefined): UserRole {
  return isUserRole(roleParam) ? roleParam : "staff";
}
