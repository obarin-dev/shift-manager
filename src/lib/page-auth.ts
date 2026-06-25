import { redirect } from "next/navigation";
import { getSession, type SessionData } from "@/lib/auth-session";
import { getAuthAccountByUserId, type AuthAccount } from "@/lib/user-db";

export async function requireAuth(): Promise<{
  session: SessionData;
  account: AuthAccount;
}> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const account = await getAuthAccountByUserId(session.userId);

  if (!account) {
    redirect("/login");
  }

  return { session, account };
}

export async function requireAdminOrManager(): Promise<{
  session: SessionData;
  account: AuthAccount;
}> {
  const result = await requireAuth();

  if (result.account.role === "staff") {
    redirect("/home");
  }

  return result;
}
