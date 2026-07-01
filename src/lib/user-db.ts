import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidUserRole, type UserRole } from "@/lib/auth-session";

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

function toAuthAccount(staff: {
  id: string;
  nursery_id: string;
  name: string;
  email: string | null;
  role: string | null;
}): AuthAccount | null {
  if (!staff.email || !staff.role || !isValidUserRole(staff.role)) {
    return null;
  }
  return {
    userId: staff.id,
    nurseryId: staff.nursery_id,
    staffId: staff.id,
    role: staff.role,
    roleLabel: getRoleLabel(staff.role),
    email: staff.email,
    displayName: staff.name,
  };
}

export async function findActiveUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return prisma.staff.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      is_active: true,
      password_hash: { not: null },
      role: { not: null },
    },
  });
}

export async function getAuthAccountByUserId(staffId: string): Promise<AuthAccount | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, nursery_id: true, name: true, email: true, role: true, is_active: true },
  });

  if (!staff || !staff.is_active) {
    return null;
  }

  return toAuthAccount(staff);
}

export async function createUserInTx(
  tx: Prisma.TransactionClient,
  data: { nurseryId: string; staffId: string | null; email: string; passwordHash: string; role: "staff" }
): Promise<{ id: string; nursery_id: string; email: string }> {
  if (data.staffId) {
    return tx.staff.update({
      where: { id: data.staffId },
      data: {
        email: data.email,
        password_hash: data.passwordHash,
        role: data.role,
      },
      select: { id: true, nursery_id: true, email: true },
    }) as Promise<{ id: string; nursery_id: string; email: string }>;
  }

  return tx.staff.create({
    data: {
      nursery_id: data.nurseryId,
      name: data.email.split("@")[0] ?? data.email,
      email: data.email,
      password_hash: data.passwordHash,
      role: data.role,
      is_active: true,
      capable_class_ids: [],
    },
    select: { id: true, nursery_id: true, email: true },
  }) as Promise<{ id: string; nursery_id: string; email: string }>;
}

export async function listDemoAccountsForLogin(): Promise<DemoAccountSummary[]> {
  const rows = await prisma.staff.findMany({
    where: { is_active: true, email: { not: null }, role: { not: null } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { email: true, role: true },
  });

  return rows.flatMap((row) => {
    if (!row.email || !row.role || !isValidUserRole(row.role)) return [];
    return [{ email: row.email, roleLabel: getRoleLabel(row.role) }];
  });
}
