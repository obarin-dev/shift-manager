import {
  generateTimeOptions,
  sortClassrooms,
  type Classroom,
} from "@/lib/classroom-helpers";
import { getStaffSurname } from "@/lib/shift-helpers";

export type RosterTimeSlot = string;

export type RosterSheetRow =
  | { id: string; kind: "schedule"; timeSlot: RosterTimeSlot }
  | { id: string; kind: "note"; label: string; notesByClassroom: Record<string, string> };

export type RosterTemplatePayload = {
  rows: RosterSheetRow[];
  slotCountsByRowAndClass: Record<string, number>;
};

export type RosterCellAssignment = {
  row_id: string;
  classroom_id: string;
  staff_ids: string[];
  time_slot?: RosterTimeSlot;
};

export type RosterScheduleRowRef = {
  id: string;
  timeSlot: RosterTimeSlot;
};

export const ROSTER_START_HOUR = 7;
export const ROSTER_END_HOUR = 19;
export const ROSTER_DEFAULT_START_TIME = "07:00";
export const ROSTER_DEFAULT_END_TIME = "19:00";
export const ROSTER_DEFAULT_STEP_MINUTES = 60;
export const ROSTER_STEP_MINUTES_OPTIONS = [30, 60] as const;

function parseTimeParts(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

export function dailyChildCountKey(dateKey: string, classroomId: string) {
  return `${dateKey}:${classroomId}`;
}

export function getTodayChildCount(
  dailyChildCounts: Record<string, number>,
  dateKey: string,
  classroom: Classroom,
) {
  const key = dailyChildCountKey(dateKey, classroom.id);
  return key in dailyChildCounts ? dailyChildCounts[key] : "";
}

export function parseDailyChildCountInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
    return null;
  }
  return parsed;
}

export function buildRosterHourlySlots() {
  return generateTimeOptions(ROSTER_START_HOUR, 0, ROSTER_END_HOUR, 0, 60);
}

export function buildRosterTimeSlots(
  startTime: string,
  endTime: string,
  stepMinutes: number,
) {
  const start = parseTimeParts(startTime);
  const end = parseTimeParts(endTime);

  if (!start || !end || stepMinutes <= 0) {
    return [];
  }

  const startTotal = start.hour * 60 + start.minute;
  const endTotal = end.hour * 60 + end.minute;
  if (endTotal < startTotal) {
    return [];
  }

  return generateTimeOptions(
    start.hour,
    start.minute,
    end.hour,
    end.minute,
    stepMinutes,
  );
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function getClassroomStaffPool(classroom: Classroom) {
  return [classroom.mainStaffId, ...classroom.otherStaffIds].filter(
    (id): id is string => Boolean(id),
  );
}

function normalizeRosterTime(value: string) {
  const parts = parseTimeParts(value);
  if (!parts) {
    return value.trim();
  }

  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function migrateRosterAssignments(
  rows: Array<{ id: string; kind: string; timeSlot?: string }>,
  assignments: RosterCellAssignment[],
  classrooms: Classroom[] = [],
): RosterCellAssignment[] {
  if (assignments.length === 0) {
    return [];
  }

  if (assignments.every((assignment) => Boolean(assignment.row_id))) {
    return assignments;
  }

  const scheduleRows = rows.filter(
    (row): row is { id: string; kind: "schedule"; timeSlot: string } =>
      row.kind === "schedule" && Boolean(row.timeSlot),
  );
  const legacyPool = assignments
    .map((assignment, index) => ({ assignment, index }))
    .filter(({ assignment }) => !assignment.row_id);

  const migrated: RosterCellAssignment[] = [];

  for (const row of scheduleRows) {
    const rowTime = normalizeRosterTime(row.timeSlot);

    for (const classroom of classrooms) {
      const existing = assignments.find(
        (assignment) => assignment.row_id === row.id && assignment.classroom_id === classroom.id,
      );
      if (existing) {
        migrated.push({
          row_id: row.id,
          classroom_id: classroom.id,
          staff_ids: existing.staff_ids,
        });
        continue;
      }

      const poolIndex = legacyPool.findIndex(
        ({ assignment }) =>
          assignment.classroom_id === classroom.id &&
          assignment.time_slot !== undefined &&
          normalizeRosterTime(assignment.time_slot) === rowTime,
      );
      if (poolIndex < 0) {
        continue;
      }

      const { assignment } = legacyPool.splice(poolIndex, 1)[0]!;
      migrated.push({
        row_id: row.id,
        classroom_id: classroom.id,
        staff_ids: assignment.staff_ids,
      });
    }
  }

  return migrated;
}

export function buildMockRosterAssignments(
  dateKey: string,
  scheduleRows: RosterScheduleRowRef[],
  classrooms: Classroom[] = [],
): RosterCellAssignment[] {
  return scheduleRows.flatMap((row) =>
    classrooms.map((classroom) => {
      const pool = getClassroomStaffPool(classroom);
      const timeSlot = row.timeSlot;

      if (pool.length === 0) {
        return { row_id: row.id, classroom_id: classroom.id, staff_ids: [] };
      }

      const seed = hashSeed(`${dateKey}:${row.id}:${classroom.id}:${timeSlot}`);
      const primary = pool[seed % pool.length]!;
      const hour = Number(timeSlot.split(":")[0]);

      if (pool.length > 1 && hour >= 9 && hour <= 16 && seed % 3 === 0) {
        const secondary = pool[(seed + 1) % pool.length]!;
        const staff_ids = primary === secondary ? [primary] : [primary, secondary];
        return { row_id: row.id, classroom_id: classroom.id, staff_ids };
      }

      return { row_id: row.id, classroom_id: classroom.id, staff_ids: [primary] };
    }),
  );
}

export function buildRosterAssignmentMap(assignments: RosterCellAssignment[]) {
  const map = new Map<string, string[]>();

  for (const assignment of assignments) {
    map.set(`${assignment.classroom_id}:${assignment.row_id}`, assignment.staff_ids);
  }

  return map;
}

export function getRosterCellStaffIds(
  map: Map<string, string[]>,
  classroomId: string,
  rowId: string,
) {
  return map.get(`${classroomId}:${rowId}`) ?? [];
}

export function formatRosterStaffLabels(
  staffIds: string[],
  resolveStaffName: (staffId: string) => string | null,
) {
  return staffIds
    .map((staffId) => {
      const name = resolveStaffName(staffId);
      return name ? getStaffSurname(name) : null;
    })
    .filter((name): name is string => Boolean(name));
}

export function formatRosterDateHeading(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const next = new Date(`${dateKey}T12:00:00`);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function setRosterCellStaffIds(
  assignments: RosterCellAssignment[],
  rowId: string,
  classroomId: string,
  staffIds: string[],
) {
  const normalized = staffIds.filter(Boolean);
  const index = assignments.findIndex(
    (assignment) => assignment.row_id === rowId && assignment.classroom_id === classroomId,
  );

  if (index < 0) {
    if (normalized.length === 0) {
      return assignments;
    }

    return [
      ...assignments,
      { row_id: rowId, classroom_id: classroomId, staff_ids: normalized },
    ];
  }

  if (normalized.length === 0) {
    return assignments.filter((_, assignmentIndex) => assignmentIndex !== index);
  }

  return assignments.map((assignment, assignmentIndex) => {
    if (assignmentIndex !== index) {
      return assignment;
    }

    return { ...assignment, staff_ids: normalized };
  });
}

export function getRosterCellStaffSlots(staffIds: string[]) {
  if (staffIds.length === 0) {
    return [""];
  }

  return staffIds;
}

export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** シフト出勤スタッフの在勤情報。既存行への充填に使う */
export type StaffPresence = {
  staffId: string;
  classroomId: string;
  startMinutes: number;
  endMinutes: number;
};

/** 任意の行リストと在勤情報からセル配置を生成する */
export function buildAssignmentsFromPresences(
  rows: Array<{ id: string; kind: string; timeSlot?: string }>,
  staffPresences: StaffPresence[],
): RosterCellAssignment[] {
  const assignments: RosterCellAssignment[] = [];

  for (const row of rows) {
    if (row.kind !== "schedule" || !row.timeSlot) continue;
    const rowMin = timeStringToMinutes(row.timeSlot);

    const cellMap = new Map<string, string[]>();
    for (const presence of staffPresences) {
      if (rowMin >= presence.startMinutes && rowMin < presence.endMinutes) {
        const current = cellMap.get(presence.classroomId) ?? [];
        if (!current.includes(presence.staffId)) {
          cellMap.set(presence.classroomId, [...current, presence.staffId]);
        }
      }
    }

    for (const [classroomId, staffIds] of cellMap) {
      assignments.push({ row_id: row.id, classroom_id: classroomId, staff_ids: staffIds });
    }
  }

  return assignments;
}

/**
 * テンプレートの枠数を権威として、在勤スタッフを行ごとに適切なクラスに配置する。
 * staffPresences.classroomId は優先クラスとして扱い、枠がなければ他クラスに柔軟に移動する。
 */
export function buildTemplateAwareAssignments(
  rows: Array<{ id: string; kind: string; timeSlot?: string }>,
  staffPresences: StaffPresence[],
  slotCountsByRowAndClass: Record<string, number>,
  classroomIds: string[],
): RosterCellAssignment[] {
  const assignments: RosterCellAssignment[] = [];

  for (const row of rows) {
    if (row.kind !== "schedule" || !row.timeSlot) continue;
    const rowMin = timeStringToMinutes(row.timeSlot);

    const activePresences = staffPresences.filter(
      (p) => rowMin >= p.startMinutes && rowMin < p.endMinutes,
    );
    if (activePresences.length === 0) continue;

    const capacity = new Map<string, number>(
      classroomIds.map((id) => [id, slotCountsByRowAndClass[`${row.id}:${id}`] ?? 0]),
    );
    const assigned = new Map<string, string[]>(classroomIds.map((id) => [id, []]));

    const overflow: StaffPresence[] = [];

    // 第1パス: 優先クラスに枠があれば配置
    for (const presence of activePresences) {
      const cap = capacity.get(presence.classroomId) ?? 0;
      const current = assigned.get(presence.classroomId);
      if (current !== undefined && current.length < cap) {
        current.push(presence.staffId);
      } else {
        overflow.push(presence);
      }
    }

    // 第2パス: あぶれたスタッフを空き枠のあるクラスへ柔軟配置（配置数が少ない順）
    for (const presence of overflow) {
      const sortedIds = [...classroomIds].sort(
        (a, b) => (assigned.get(a)?.length ?? 0) - (assigned.get(b)?.length ?? 0),
      );
      for (const classroomId of sortedIds) {
        const cap = capacity.get(classroomId) ?? 0;
        const current = assigned.get(classroomId)!;
        if (current.length < cap) {
          current.push(presence.staffId);
          break;
        }
      }
    }

    for (const [classroomId, staffIds] of assigned) {
      if (staffIds.length > 0) {
        assignments.push({ row_id: row.id, classroom_id: classroomId, staff_ids: staffIds });
      }
    }
  }

  return assignments;
}

