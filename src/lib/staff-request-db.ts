import type {
  StaffRequest as PrismaStaffRequest,
  StaffRequestStatus,
  StaffRequestType,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDbDate, getTodayJst, parseDateToDb } from "@/lib/nursery-time";

export type StaffRequestTypeLabel = "休み希望" | "出勤希望" | "時間相談";
export type StaffRequestStatusLabel = "提出済み" | "承認" | "要確認";

export type StaffRequestPayload = {
  id: string;
  date: string;
  type: StaffRequestTypeLabel;
  time: string;
  memo: string;
  status: StaffRequestStatusLabel;
};

export type StaffRequestWriteInput = {
  date: string;
  type: StaffRequestTypeLabel;
  time: string;
  memo?: string;
};

export type StaffRequestOwner = {
  nurseryId: string;
  userId: string;
  staffId?: string;
};

export type AdminStaffRequestItem = StaffRequestPayload & {
  staffName: string;
  userId: string;
  staffId: string | null;
  submittedAt: string;
};

export type AdminStaffRequestGroup = {
  staffId: string;
  staffName: string;
  requests: AdminStaffRequestItem[];
};

const TYPE_TO_DB: Record<StaffRequestTypeLabel, StaffRequestType> = {
  休み希望: "day_off",
  出勤希望: "work",
  時間相談: "time_consultation",
};

const TYPE_FROM_DB: Record<StaffRequestType, StaffRequestTypeLabel> = {
  day_off: "休み希望",
  work: "出勤希望",
  time_consultation: "時間相談",
};

const STATUS_FROM_DB: Record<StaffRequestStatus, StaffRequestStatusLabel> = {
  submitted: "提出済み",
  approved: "承認",
  needs_review: "要確認",
};

function normalizeMemo(memo?: string) {
  const trimmed = memo?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function toStaffRequestPayload(row: PrismaStaffRequest): StaffRequestPayload {
  return {
    id: row.id,
    date: formatDbDate(row.request_date),
    type: TYPE_FROM_DB[row.request_type],
    time: row.time_preference,
    memo: row.memo ?? "",
    status: STATUS_FROM_DB[row.status],
  };
}

export async function listStaffRequests(owner: StaffRequestOwner) {
  const todayBoundary = parseDateToDb(getTodayJst());

  const rows = await prisma.staffRequest.findMany({
    where: {
      nursery_id: owner.nurseryId,
      user_id: owner.userId,
      request_date: { gte: todayBoundary },
    },
    orderBy: [{ request_date: "asc" }, { created_at: "asc" }],
  });

  return rows.map(toStaffRequestPayload);
}



function toAdminStaffRequestItem(
  row: PrismaStaffRequest & {
    staff: { name: string } | null;
    user: {
      email: string;
      staff: { id: string; name: string } | null;
    };
  },
): AdminStaffRequestItem {
  return {
    ...toStaffRequestPayload(row),
    userId: row.user_id,
    staffId: resolveRequestStaffId(row),
    staffName: row.staff?.name ?? row.user.staff?.name ?? row.user.email,
    submittedAt: row.created_at.toISOString(),
  };
}

function resolveRequestStaffId(
  row: PrismaStaffRequest & {
    user: { staff: { id: string } | null };
  },
) {
  return row.staff_id ?? row.user.staff?.id ?? null;
}

export async function listAdminStaffRequestGroups(
  nurseryId: string,
): Promise<AdminStaffRequestGroup[]> {
  const todayBoundary = parseDateToDb(getTodayJst());

  const [staffRows, requestRows] = await Promise.all([
    prisma.staff.findMany({
      where: { nursery_id: nurseryId, is_active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.staffRequest.findMany({
      where: { nursery_id: nurseryId, request_date: { gte: todayBoundary } },
      include: {
        staff: { select: { name: true } },
        user: {
          select: {
            email: true,
            staff: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ request_date: "asc" }, { created_at: "desc" }],
    }),
  ]);

  const requestsByStaffId = new Map<string, AdminStaffRequestItem[]>();

  for (const row of requestRows) {
    const staffId = resolveRequestStaffId(row);
    if (!staffId) {
      continue;
    }

    const item = toAdminStaffRequestItem(row);

    const existing = requestsByStaffId.get(staffId);
    if (existing) {
      existing.push(item);
    } else {
      requestsByStaffId.set(staffId, [item]);
    }
  }

  return staffRows.map((staff) => ({
    staffId: staff.id,
    staffName: staff.name,
    requests: requestsByStaffId.get(staff.id) ?? [],
  }));
}

export async function listAdminStaffRequestGroupsForMonth(
  nurseryId: string,
  targetMonth: string,
): Promise<AdminStaffRequestGroup[]> {
  const [staffRows, requestRows] = await Promise.all([
    prisma.staff.findMany({
      where: { nursery_id: nurseryId, is_active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.staffRequest.findMany({
      where: {
        nursery_id: nurseryId,
        request_date: {
          gte: parseDateToDb(`${targetMonth}-01`),
          lt: parseDateToDb((() => {
            const [y, m] = targetMonth.split("-").map(Number);
            return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
          })()),
        },
      },
      include: {
        staff: { select: { name: true } },
        user: {
          select: {
            email: true,
            staff: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ request_date: "asc" }, { created_at: "desc" }],
    }),
  ]);

  const requestsByStaffId = new Map<string, AdminStaffRequestItem[]>();

  for (const row of requestRows) {
    const staffId = resolveRequestStaffId(row);
    if (!staffId) continue;
    const item = toAdminStaffRequestItem(row);
    const existing = requestsByStaffId.get(staffId);
    if (existing) {
      existing.push(item);
    } else {
      requestsByStaffId.set(staffId, [item]);
    }
  }

  return staffRows
    .map((staff) => ({
      staffId: staff.id,
      staffName: staff.name,
      requests: requestsByStaffId.get(staff.id) ?? [],
    }))
    .filter((group) => group.requests.length > 0);
}

export async function createStaffRequest(
  owner: StaffRequestOwner,
  input: StaffRequestWriteInput,
): Promise<StaffRequestPayload | "duplicate"> {
  const requestDate = parseDateToDb(input.date);
  const requestType = TYPE_TO_DB[input.type];

  try {
    const row = await prisma.staffRequest.create({
      data: {
        nursery_id: owner.nurseryId,
        user_id: owner.userId,
        staff_id: owner.staffId ?? null,
        request_date: requestDate,
        request_type: requestType,
        time_preference: input.time.trim(),
        memo: normalizeMemo(input.memo),
        status: "submitted",
      },
    });
    return toStaffRequestPayload(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      (error.meta.target as string[]).includes("user_id") &&
      (error.meta.target as string[]).includes("request_date") &&
      (error.meta.target as string[]).includes("request_type")
    ) {
      return "duplicate";
    }
    throw error;
  }
}

export async function updateStaffRequest(
  owner: StaffRequestOwner,
  id: string,
  input: StaffRequestWriteInput,
): Promise<StaffRequestPayload | "duplicate" | "locked" | null> {
  const requestDate = parseDateToDb(input.date);
  const requestType = TYPE_TO_DB[input.type];

  const existing = await prisma.staffRequest.findFirst({
    where: {
      id,
      nursery_id: owner.nurseryId,
      user_id: owner.userId,
    },
  });

  if (!existing) {
    return null;
  }

  if (existing.status !== "submitted") {
    return "locked";
  }

  try {
    const row = await prisma.staffRequest.update({
      where: { id, nursery_id: owner.nurseryId, user_id: owner.userId, status: "submitted" },
      data: {
        request_date: requestDate,
        request_type: requestType,
        time_preference: input.time.trim(),
        memo: normalizeMemo(input.memo),
      },
    });
    return toStaffRequestPayload(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        (error.meta.target as string[]).includes("user_id") &&
        (error.meta.target as string[]).includes("request_date") &&
        (error.meta.target as string[]).includes("request_type")
      )
        return "duplicate";
      if (error.code === "P2025") {
        const stillExists = await prisma.staffRequest.findFirst({ where: { id, nursery_id: owner.nurseryId, user_id: owner.userId }, select: { id: true } });
        return stillExists ? "locked" : null;
      }
    }
    throw error;
  }
}

export async function deleteStaffRequest(owner: StaffRequestOwner, id: string) {
  const existing = await prisma.staffRequest.findFirst({
    where: {
      id,
      nursery_id: owner.nurseryId,
      user_id: owner.userId,
    },
    select: { id: true, status: true },
  });

  if (!existing) {
    return false;
  }

  if (existing.status !== "submitted") {
    return "locked" as const;
  }

  try {
    await prisma.staffRequest.delete({ where: { id, status: "submitted" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      const stillExists = await prisma.staffRequest.findFirst({ where: { id, nursery_id: owner.nurseryId, user_id: owner.userId }, select: { id: true } });
      return stillExists ? "locked" as const : false;
    }
    throw error;
  }
  return true;
}
