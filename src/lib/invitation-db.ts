import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type InvitationMethod = "qr" | "url";
export type InvitationStatus = "pending" | "used" | "expired" | "disabled";

export type InvitationRecord = {
  id: string;
  nurseryId: string;
  staffId: string | null;
  staffName: string | null;
  adminNote: string;
  method: InvitationMethod;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
};

function generateToken(): string {
  return randomBytes(20).toString("hex");
}

function toRecord(inv: {
  id: string;
  nursery_id: string;
  staff_id: string | null;
  admin_note: string;
  method: string;
  status: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  staff: { name: string } | null;
}): InvitationRecord {
  const now = new Date();
  let status = inv.status as InvitationStatus;
  if (status === "pending" && inv.expires_at < now) {
    status = "expired";
  }

  return {
    id: inv.id,
    nurseryId: inv.nursery_id,
    staffId: inv.staff_id,
    staffName: inv.staff?.name ?? null,
    adminNote: inv.admin_note,
    method: inv.method as InvitationMethod,
    status,
    token: inv.token,
    expiresAt: inv.expires_at.toISOString(),
    createdAt: inv.created_at.toISOString(),
  };
}

const INCLUDE_STAFF = { staff: { select: { name: true } } } as const;

export async function createInvitation({
  nurseryId,
  staffId,
  adminNote,
  method,
  expiryHours,
}: {
  nurseryId: string;
  staffId: string | null;
  adminNote: string;
  method: InvitationMethod;
  expiryHours: number;
}): Promise<InvitationRecord> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const inv = await prisma.invitation.create({
    data: {
      nursery_id: nurseryId,
      staff_id: staffId ?? null,
      admin_note: adminNote,
      method,
      status: "pending",
      token,
      expires_at: expiresAt,
    },
    include: INCLUDE_STAFF,
  });

  return toRecord(inv);
}

export async function listPendingInvitations(nurseryId: string): Promise<InvitationRecord[]> {
  const invitations = await prisma.invitation.findMany({
    where: { nursery_id: nurseryId },
    include: INCLUDE_STAFF,
    orderBy: { created_at: "desc" },
  });

  return invitations.map(toRecord);
}

export async function getInvitationByToken(token: string): Promise<InvitationRecord | null> {
  const inv = await prisma.invitation.findUnique({
    where: { token },
    include: INCLUDE_STAFF,
  });

  if (!inv) return null;
  return toRecord(inv);
}

export async function markInvitationUsed(token: string): Promise<void> {
  await prisma.invitation.update({
    where: { token },
    data: { status: "used" },
  });
}
