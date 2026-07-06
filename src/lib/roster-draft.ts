import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import { listClassrooms } from "@/lib/classroom-db";
import { sortClassrooms } from "@/lib/classroom-helpers";
import { parseDateToDb } from "@/lib/nursery-time";
import {
  buildAssignmentsFromPresences,
  buildRosterTimeSlots,
  ROSTER_DEFAULT_START_TIME,
  ROSTER_DEFAULT_END_TIME,
  ROSTER_DEFAULT_STEP_MINUTES,
  type StaffPresence,
} from "@/lib/roster-helpers";
import type { RosterSheetPayload, RosterSheetRow } from "@/lib/roster-db";

export type { StaffPresence };

function createRowId() {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function dbTimeToMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export type RosterDraftResult =
  | { hasPublishedSchedule: true; draft: RosterSheetPayload; staffPresences: StaffPresence[] }
  | { hasPublishedSchedule: false; draft: null; staffPresences: [] };

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
    return { hasPublishedSchedule: false, draft: null, staffPresences: [] };
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

  // 在勤情報を構築（既存行への充填で行のステップ幅に依存しない）
  const staffPresences: StaffPresence[] = [];
  for (const slot of slots) {
    if (!slot.shift_type) continue;
    const classroomId = staffClassroomMap.get(slot.staff_id);
    if (!classroomId) continue;
    staffPresences.push({
      staffId: slot.staff_id,
      classroomId,
      startMinutes: dbTimeToMinutes(slot.shift_type.start_time),
      endMinutes: dbTimeToMinutes(slot.shift_type.end_time),
    });
  }

  // 保存データがない場合向けのデフォルト行 + 配置（初回セットアップ用）
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

  const assignments = buildAssignmentsFromPresences(rows, staffPresences);

  return {
    hasPublishedSchedule: true,
    draft: {
      rows,
      assignments,
      todayChildCounts: {},
      slotCountsByRowAndClass: {},
    },
    staffPresences,
  };
}

