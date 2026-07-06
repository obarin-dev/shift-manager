import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ShiftAssignment, ShiftScheduleStatus } from "@/lib/shift-helpers";
import type { StaffMember } from "@/lib/staff-helpers";
import type { Classroom } from "@/lib/classroom-helpers";
import type { ShiftTypeDefinition, NurseryRestSettings } from "@/lib/nursery-helpers";
import { resolveNurseryId } from "@/lib/nursery-db";
import { formatDbDate, parseDateToDb } from "@/lib/nursery-time";
import { SHIFT_CELL_OFF } from "@/lib/shift-schedule-options";
import { createShiftPublishedNotifications } from "@/lib/notification-db";

export type ShiftSchedulePayload = {
  status: ShiftScheduleStatus;
  assignments: ShiftAssignment[];
};

export type PublishedShiftScheduleData = ShiftSchedulePayload & {
  staff: StaffMember[];
  classrooms: Classroom[];
  shiftTypes: ShiftTypeDefinition[];
  holidaySettings: NurseryRestSettings | null;
};


function toShiftAssignment(slot: {
  staff_id: string;
  work_date: Date;
  shift_type_id: string | null;
}): ShiftAssignment {
  return {
    staff_id: slot.staff_id,
    work_date: formatDbDate(slot.work_date),
    shift_type: slot.shift_type_id ?? SHIFT_CELL_OFF,
  };
}

function parsePublishedAssignments(value: Prisma.JsonValue | null): ShiftAssignment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const assignments: ShiftAssignment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;
    if (
      typeof row.staff_id !== "string" ||
      typeof row.work_date !== "string" ||
      typeof row.shift_type !== "string"
    ) {
      continue;
    }

    assignments.push({
      staff_id: row.staff_id,
      work_date: row.work_date,
      shift_type: row.shift_type,
    });
  }

  return assignments;
}

export async function getShiftScheduleByMonth(
  targetMonth: string,
  nurseryId?: string,
): Promise<ShiftSchedulePayload | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const schedule = await prisma.shiftSchedule.findUnique({
    where: {
      nursery_id_target_month: {
        nursery_id: resolvedNurseryId,
        target_month: targetMonth,
      },
    },
    include: {
      slots: {
        orderBy: [{ work_date: "asc" }, { staff_id: "asc" }],
      },
    },
  });

  if (!schedule) {
    return null;
  }

  return {
    status: schedule.status as ShiftScheduleStatus,
    assignments: schedule.slots.map(toShiftAssignment),
  };
}

export async function getPublishedShiftScheduleByMonth(
  targetMonth: string,
  nurseryId?: string,
): Promise<ShiftSchedulePayload | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const schedule = await prisma.shiftSchedule.findUnique({
    where: {
      nursery_id_target_month: {
        nursery_id: resolvedNurseryId,
        target_month: targetMonth,
      },
    },
    include: {
      slots: {
        orderBy: [{ work_date: "asc" }, { staff_id: "asc" }],
      },
    },
  });

  if (!schedule) {
    return null;
  }

  const assignments = schedule.published_payload
    ? parsePublishedAssignments(schedule.published_payload)
    : schedule.status === "published"
      ? schedule.slots.map(toShiftAssignment)
      : [];

  return {
    status: "published",
    assignments,
  };
}

export async function saveShiftSchedule(
  targetMonth: string,
  payload: ShiftSchedulePayload,
  nurseryId?: string,
) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const status = payload.status as ShiftScheduleStatus;
  const isPublishing = payload.status === "published";
  const publishedPayload = payload.assignments as unknown as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    let isFirstPublish = false;
    if (isPublishing) {
      const existing = await tx.shiftSchedule.findFirst({
        where: { nursery_id: resolvedNurseryId, target_month: targetMonth },
        select: { published_at: true },
      });
      isFirstPublish = existing?.published_at == null;
    }

    const schedule = await tx.shiftSchedule.upsert({
      where: {
        nursery_id_target_month: {
          nursery_id: resolvedNurseryId,
          target_month: targetMonth,
        },
      },
      create: {
        nursery_id: resolvedNurseryId,
        target_month: targetMonth,
        status,
        published_payload: isPublishing ? publishedPayload : undefined,
        published_at: isPublishing ? new Date() : undefined,
      },
      update: {
        status,
        ...(isPublishing
          ? {
              published_payload: publishedPayload,
              published_at: new Date(),
            }
          : {}),
      },
    });

    await tx.shiftSlot.deleteMany({
      where: { shift_schedule_id: schedule.id },
    });

    const monthStart = new Date(`${targetMonth}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    await tx.staffRequest.updateMany({
      where: {
        nursery_id: resolvedNurseryId,
        status: "submitted",
        request_date: { gte: monthStart, lt: monthEnd },
      },
      data: { status: "approved" },
    });

    if (payload.assignments.length === 0) {
      return;
    }

    await tx.shiftSlot.createMany({
      data: payload.assignments.map((assignment) => ({
        shift_schedule_id: schedule.id,
        staff_id: assignment.staff_id,
        work_date: parseDateToDb(assignment.work_date),
        shift_type_id: assignment.shift_type === SHIFT_CELL_OFF ? null : assignment.shift_type,
      })),
    });
  });

  if (isPublishing) {
    await createShiftPublishedNotifications(resolvedNurseryId, targetMonth).catch((err) => {
      console.error("[saveShiftSchedule] notification creation failed:", err);
    });
  }
}
