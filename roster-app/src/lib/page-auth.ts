import { redirect } from "next/navigation";
import { getSession, isAdminOrManager, roleLabel, type SessionData, type UserRole } from "@/lib/auth-session";

// 本体のAuthAccount(Staffテーブル参照)は使わず、JWTセッションに載っている
// 情報だけでヘッダー表示に必要な最小限のアカウント情報を組み立てる。
export type LightAccount = {
  userId: string;
  nurseryId: string;
  role: UserRole;
  email: string;
  roleLabel: string;
};

function toLightAccount(session: SessionData): LightAccount {
  return {
    userId: session.userId,
    nurseryId: session.nurseryId,
    role: session.role,
    email: session.email,
    roleLabel: roleLabel(session.role),
  };
}

export async function requireAuth(): Promise<{ session: SessionData; account: LightAccount }> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return { session, account: toLightAccount(session) };
}

export async function requireAdminOrManager(): Promise<{ session: SessionData; account: LightAccount }> {
  const result = await requireAuth();

  if (!isAdminOrManager(result.account.role)) {
    redirect("/home");
  }

  return result;
}

export function isReadOnlyRole(role: UserRole): boolean {
  return role === "manager";
}
