import type {
  StaffRequest as PrismaStaffRequest,
  StaffRequestStatus,
  StaffRequestType,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDbDate, parseDateToDb } from "@/lib/nursery-time";

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
  const rows = await prisma.staffRequest.findMany({
    where: {
      nursery_id: owner.nurseryId,
      user_id: owner.userId,
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
    submittedAt: formatDbDate(row.created_at),
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
  const [staffRows, requestRows] = await Promise.all([
    prisma.staff.findMany({
      where: { nursery_id: nurseryId, is_active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.staffRequest.findMany({
      where: { nursery_id: nurseryId },
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
) {
  const groups = await listAdminStaffRequestGroups(nurseryId);
  return groups
    .map((group) => ({
      ...group,
      requests: group.requests.filter((request) => request.date.startsWith(`${targetMonth}-`)),
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
      where: { id },
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
      if (error.code === "P2002") return "duplicate";
      if (error.code === "P2025") return null;
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
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  try {
    await prisma.staffRequest.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return false;
    }
    throw error;
  }
  return true;
}
