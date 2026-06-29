import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/auth-session";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  manager: "勤務表作成者",
  staff: "職員",
};

export type AuthAccount = {
  userId: string;
  nurseryId: string;
  staffId?: string;
  role: UserRole;
  roleLabel: string;
  email: string;
  displayName: string;
};

export type DemoAccountSummary = {
  email: string;
  roleLabel: string;
};

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

function isValidRole(role: string): role is UserRole {
  return role in ROLE_LABELS;
}

function toAuthAccount(user: {
  id: string;
  nursery_id: string;
  staff_id: string | null;
  email: string;
  role: string;
  staff: { name: string } | null;
}): AuthAccount | null {
  if (!isValidRole(user.role)) {
    return null;
  }
  const role = user.role;

  return {
    userId: user.id,
    nurseryId: user.nursery_id,
    staffId: user.staff_id ?? undefined,
    role,
    roleLabel: getRoleLabel(role),
    email: user.email,
    displayName: user.staff?.name ?? user.email.split("@")[0] ?? user.email,
  };
}

export async function findActiveUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  return prisma.user.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      is_active: true,
    },
    include: {
      staff: { select: { name: true } },
    },
  });
}

export async function getAuthAccountByUserId(userId: string): Promise<AuthAccount | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      staff: { select: { name: true } },
    },
  });

  if (!user || !user.is_active) {
    return null;
  }

  return toAuthAccount(user);
}


export async function listDemoAccountsForLogin(): Promise<DemoAccountSummary[]> {
  const users = await prisma.user.findMany({
    where: { is_active: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { email: true, role: true },
  });

  return users.flatMap((user) => {
    if (!isValidRole(user.role)) return [];
    return [{ email: user.email, roleLabel: getRoleLabel(user.role) }];
  });
}
