import { NextResponse } from "next/server";
import { getSession, type UserRole } from "@/lib/auth-session";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/**
 * Verifies the session and checks that the caller's role is in `allowedRoles`.
 * Returns `{ session }` on success, or a NextResponse error to return immediately.
 */
export async function requireApiRole(allowedRoles: UserRole[]) {
  const session = await getSession();
  if (!session) return { error: unauthorizedResponse() };
  if (!allowedRoles.includes(session.role)) return { error: forbiddenResponse() };
  return { session };
}
