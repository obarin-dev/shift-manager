import { NextResponse } from "next/server";
import { getSession, type SessionData, type UserRole } from "@/lib/auth-session";

export async function getRequiredSession(): Promise<SessionData | null> {
  return getSession();
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export function hasRole(session: SessionData, roles: UserRole[]): boolean {
  return roles.includes(session.role);
}
