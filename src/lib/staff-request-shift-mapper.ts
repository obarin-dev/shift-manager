import type { ShiftTypeDefinition } from "@/lib/nursery-helpers";
import type { ShiftAssignment } from "@/lib/shift-helpers";
import {
  SHIFT_CELL_OFF,
  type ShiftCellValue,
} from "@/lib/shift-schedule-options";
import type {
  AdminStaffRequestGroup,
  StaffRequestTypeLabel,
} from "@/lib/staff-request-db";

function findShiftIdByCode(shiftTypes: ShiftTypeDefinition[], code: string) {
  return shiftTypes.find((shift) => shift.is_active && shift.code === code)?.id ?? null;
}

function mapRequestToShiftType(
  type: StaffRequestTypeLabel,
  time: string,
  shiftTypes: ShiftTypeDefinition[],
): ShiftCellValue | null {
  if (type === "休み希望") {
    return SHIFT_CELL_OFF;
  }

  const earlyId = findShiftIdByCode(shiftTypes, "early");
  const dayId = findShiftIdByCode(shiftTypes, "day");
  const lateId = findShiftIdByCode(shiftTypes, "late");

  if (type === "出勤希望") {
    if (time === "午前のみ" || time === "早番希望") {
      return earlyId ?? dayId;
    }
    if (time === "午後のみ") {
      return lateId ?? dayId;
    }
    if (time === "遅番不可") {
      return dayId ?? earlyId;
    }
    return dayId;
  }

  if (type === "時間相談") {
    if (time === "早番希望" || time === "午前のみ") {
      return earlyId ?? dayId;
    }
    if (time === "午後のみ") {
      return lateId ?? dayId;
    }
    if (time === "遅番不可") {
      return dayId ?? earlyId;
    }
  }

  return null;
}

export function mergeStaffRequestsIntoAssignments(
  assignments: ShiftAssignment[],
  groups: AdminStaffRequestGroup[],
  shiftTypes: ShiftTypeDefinition[],
): ShiftAssignment[] {
  const map = new Map<string, ShiftAssignment>();
  for (const assignment of assignments) {
    map.set(`${assignment.staff_id}:${assignment.work_date}`, assignment);
  }

  for (const group of groups) {
    for (const request of group.requests) {
      const shiftType = mapRequestToShiftType(request.type, request.time, shiftTypes);
      if (!shiftType) {
        continue;
      }

      map.set(`${group.staffId}:${request.date}`, {
        staff_id: group.staffId,
        work_date: request.date,
        shift_type: shiftType,
      });
    }
  }

  return Array.from(map.values());
}
