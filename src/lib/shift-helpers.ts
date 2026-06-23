import {
  SHIFT_CELL_OFF,
  buildRotationValues,
  type ShiftCellValue,
} from "@/lib/shift-schedule-options";
import type { ShiftTypeDefinition } from "@/lib/nursery-helpers";
import type { ShiftScheduleStatus } from "@/generated/prisma/client";

export type { ShiftCellValue } from "@/lib/shift-schedule-options";
export type { ShiftScheduleStatus };

export type ShiftAssignment = {
  staff_id: string;
  work_date: string;
  shift_type: ShiftCellValue;
};

export type MonthlyShiftSchedule = {
  id: string;
  target_month: string;
  status: ShiftScheduleStatus;
  assignments: ShiftAssignment[];
};

export function getStaffSurname(name: string) {
  const trimmed = name.trim();
  const parts = trimmed.split(/[\s　]+/).filter(Boolean);
  return parts[0] ?? trimmed;
}

export function buildMonthDateKeys(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const monthKey = String(month).padStart(2, "0");

  return Array.from({ length: lastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${monthKey}-${day}`;
  });
}

export function parseTargetMonth(targetMonth: string) {
  const [yearText, monthText] = targetMonth.split("-");
  return {
    year: Number(yearText),
    month: Number(monthText),
  };
}

export function formatTargetMonthLabel(targetMonth: string) {
  const { year, month } = parseTargetMonth(targetMonth);
  return `${year}年${month}月`;
}

export function shiftTargetMonth(targetMonth: string, delta: number) {
  const { year, month } = parseTargetMonth(targetMonth);
  const anchor = new Date(year, month - 1 + delta, 1);
  const nextYear = anchor.getFullYear();
  const nextMonth = String(anchor.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function getCurrentTargetMonth(referenceDate: Date = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function buildAssignmentsForMonth(
  year: number,
  month: number,
  shiftTypes: ShiftTypeDefinition[],
  staffIds: string[],
): ShiftAssignment[] {
  const dateKeys = buildMonthDateKeys(year, month);
  const rotation = buildRotationValues(shiftTypes);

  if (rotation.length === 0 || staffIds.length === 0) {
    return [];
  }

  return staffIds.flatMap((staffId) =>
    dateKeys.map((workDate) => {
      const parsed = new Date(`${workDate}T12:00:00`);
      const dayOfWeek = parsed.getDay();
      const seed = hashSeed(`${staffId}-${workDate}`);

      if (dayOfWeek === 0) {
        return {
          staff_id: staffId,
          work_date: workDate,
          shift_type: SHIFT_CELL_OFF,
        };
      }

      const shift_type = rotation[seed % rotation.length]!;
      return { staff_id: staffId, work_date: workDate, shift_type };
    }),
  );
}

export function buildAssignmentMap(assignments: ShiftAssignment[]) {
  const map = new Map<string, ShiftCellValue>();

  for (const assignment of assignments) {
    map.set(`${assignment.staff_id}:${assignment.work_date}`, assignment.shift_type);
  }

  return map;
}

export function getAssignmentForCell(
  map: Map<string, ShiftCellValue>,
  staffId: string,
  workDate: string,
): ShiftCellValue | null {
  return map.get(`${staffId}:${workDate}`) ?? null;
}

export function formatDateHeader(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][parsed.getDay()]!;
  return {
    day: parsed.getDate(),
    weekday,
    isSunday: parsed.getDay() === 0,
    isSaturday: parsed.getDay() === 6,
  };
}
