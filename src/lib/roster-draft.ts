import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import { listClassrooms } from "@/lib/classroom-db";
import { sortClassrooms } from "@/lib/classroom-helpers";
import { parseDateToDb } from "@/lib/nursery-time";
import {
  buildRosterTimeSlots,
  ROSTER_DEFAULT_START_TIME,
  ROSTER_DEFAULT_END_TIME,
  ROSTER_DEFAULT_STEP_MINUTES,
  type RosterCellAssignment,
} from "@/lib/roster-helpers";
import type { RosterSheetPayload, RosterSheetRow } from "@/lib/roster-db";

function createRowId() {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function dbTimeToMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export type RosterDraftResult =
  | { hasPublishedSchedule: true; draft: RosterSheetPayload }
  | { hasPublishedSchedule: false; draft: null };

export async function generateRosterDraftFromShift(
  dateKey: string,
  nurseryId?: string,
): Promise<RosterDraftResult> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const targetMonth = dateKey.slice(0, 7);

  const schedule = await prisma.shiftSchedule.findUnique({
    where: {
      nursery_id_target_month: {
        nursery_id: resolvedNurseryId,
        target_month: targetMonth,
      },
    },
    select: { id: true, status: true },
  });

  if (!schedule || schedule.status !== "published") {
    return { hasPublishedSchedule: false, draft: null };
  }

  const slots = await prisma.shiftSlot.findMany({
    where: {
      shift_schedule_id: schedule.id,
      work_date: parseDateToDb(dateKey),
      shift_type_id: { not: null },
    },
    include: {
      shift_type: {
        select: { start_time: true, end_time: true },
      },
    },
  });

  const classrooms = sortClassrooms(await listClassrooms(resolvedNurseryId));

  // staff_id → classroom_id: 主担当（main）を優先、なければ副担当（sub）の最初
  const staffClassroomMap = new Map<string, string>();
  for (const classroom of classrooms) {
    if (classroom.mainStaffId) {
      staffClassroomMap.set(classroom.mainStaffId, classroom.id);
    }
  }
  for (const classroom of classrooms) {
    for (const staffId of classroom.otherStaffIds) {
      if (!staffClassroomMap.has(staffId)) {
        staffClassroomMap.set(staffId, classroom.id);
      }
    }
  }

  const timeSlots = buildRosterTimeSlots(
    ROSTER_DEFAULT_START_TIME,
    ROSTER_DEFAULT_END_TIME,
    ROSTER_DEFAULT_STEP_MINUTES,
  );
  const rows: RosterSheetRow[] = timeSlots.map((timeSlot) => ({
    id: createRowId(),
    kind: "schedule" as const,
    timeSlot,
  }));

  // classroomId → rowId → staff_ids[]
  const cellMap = new Map<string, Map<string, string[]>>();

  for (const slot of slots) {
    if (!slot.shift_type) continue;

    const classroomId = staffClassroomMap.get(slot.staff_id);
    if (!classroomId) continue;

    const shiftStartMin = dbTimeToMinutes(slot.shift_type.start_time);
    const shiftEndMin = dbTimeToMinutes(slot.shift_type.end_time);

    for (const row of rows) {
      if (row.kind !== "schedule") continue;
      const rowMin = timeStringToMinutes(row.timeSlot);

      if (rowMin >= shiftStartMin && rowMin < shiftEndMin) {
        if (!cellMap.has(classroomId)) {
          cellMap.set(classroomId, new Map());
        }
        const innerMap = cellMap.get(classroomId)!;
        const current = innerMap.get(row.id) ?? [];
        if (!current.includes(slot.staff_id)) {
          innerMap.set(row.id, [...current, slot.staff_id]);
        }
      }
    }
  }

  const assignments: RosterCellAssignment[] = [];
  for (const [classroomId, rowMap] of cellMap) {
    for (const [rowId, staffIds] of rowMap) {
      if (staffIds.length > 0) {
        assignments.push({ row_id: rowId, classroom_id: classroomId, staff_ids: staffIds });
      }
    }
  }

  return {
    hasPublishedSchedule: true,
    draft: {
      rows,
      assignments,
      todayChildCounts: {},
      slotCountsByRowAndClass: {},
    },
  };
}
