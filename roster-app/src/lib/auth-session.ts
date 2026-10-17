import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionTokenEdge, VALID_ROLE_VALUES } from "@/lib/auth-edge";

export type UserRole = (typeof VALID_ROLE_VALUES)[number];

export type SessionData = {
  userId: string;
  nurseryId: string;
  role: UserRole;
  email: string;
};

export function isAdminOrManager(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

export function roleLabel(role: UserRole): string {
  return role === "admin" ? "管理者" : role === "manager" ? "勤務表作成者" : "スタッフ";
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const data = await verifySessionTokenEdge(token);
  return data as SessionData | null;
}

/** 境界API(本体アプリ)呼び出し用に、今のリクエストのセッションCookieをそのまま転送する */
export async function getForwardedCookieHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return `${SESSION_COOKIE_NAME}=${token}`;
}
