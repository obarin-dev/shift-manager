import type { NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
};

function toPayload(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  related_id: string | null;
  created_at: Date;
}): NotificationPayload {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    relatedId: row.related_id,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listNotifications(staffId: string): Promise<NotificationPayload[]> {
  const rows = await prisma.notification.findMany({
    where: { staff_id: staffId },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return rows.map(toPayload);
}

export async function countUnreadNotifications(staffId: string): Promise<number> {
  return prisma.notification.count({
    where: { staff_id: staffId, is_read: false },
  });
}

export async function markAllNotificationsRead(staffId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { staff_id: staffId, is_read: false },
    data: { is_read: true },
  });
}

export async function createShiftPublishedNotifications(
  nurseryId: string,
  targetMonth: string,
): Promise<void> {
  const staffList = await prisma.staff.findMany({
    where: { nursery_id: nurseryId, is_active: true, role: "staff" },
    select: { id: true },
  });

  if (staffList.length === 0) return;

  const [year, month] = targetMonth.split("-");
  const title = `${year}年${Number(month)}月の勤務表が公開されました`;

  await prisma.notification.createMany({
    data: staffList.map((s) => ({
      nursery_id: nurseryId,
      staff_id: s.id,
      type: "shift_published" as NotificationType,
      title,
      related_id: targetMonth,
    })),
  });
}

export async function createRequestStatusNotification(
  nurseryId: string,
  staffId: string,
  requestId: string,
  status: "approved" | "needs_review",
): Promise<void> {
  const title =
    status === "approved"
      ? "出勤希望が承認されました"
      : "出勤希望が要確認になりました";

  await prisma.notification.create({
    data: {
      nursery_id: nurseryId,
      staff_id: staffId,
      type: "request_status_changed",
      title,
      related_id: requestId,
    },
  });
}
