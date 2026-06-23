import "dotenv/config";
import { getHolidaySettings } from "../src/lib/nursery-holiday-settings-db";
import {
  buildAssignmentsForMonth,
  buildMonthDateKeys,
  type ShiftAssignment,
} from "../src/lib/shift-helpers";
import { isClosedDate } from "../src/lib/holiday-settings";
import { SHIFT_CELL_OFF } from "../src/lib/shift-schedule-options";
import {
  getShiftScheduleByMonth,
  saveShiftSchedule,
} from "../src/lib/shift-schedule-db";
import { listShiftTypes } from "../src/lib/shift-type-db";
import { listStaff } from "../src/lib/staff-db";

const TARGET_MONTH = "2026-05";

function applyClosedDayOff(
  rows: ShiftAssignment[],
  dateKeys: string[],
  staffIds: string[],
  holidaySettings: Awaited<ReturnType<typeof getHolidaySettings>>,
) {
  const closedDateKeys = new Set(
    dateKeys.filter((dateKey) => isClosedDate(dateKey, holidaySettings)),
  );
  if (closedDateKeys.size === 0) {
    return rows;
  }

  const map = new Map<string, ShiftAssignment>();
  for (const row of rows) {
    map.set(`${row.staff_id}:${row.work_date}`, row);
  }

  for (const staffId of staffIds) {
    for (const dateKey of closedDateKeys) {
      map.set(`${staffId}:${dateKey}`, {
        staff_id: staffId,
        work_date: dateKey,
        shift_type: SHIFT_CELL_OFF,
      });
    }
  }

  return Array.from(map.values());
}

async function main() {
  const existing = await getShiftScheduleByMonth(TARGET_MONTH);
  if (existing) {
    console.log(
      `${TARGET_MONTH} は既に DB にあります（${existing.assignments.length} 件）。スキップします。`,
    );
    return;
  }

  const [staff, shiftTypes, holidaySettings] = await Promise.all([
    listStaff(),
    listShiftTypes(),
    getHolidaySettings(),
  ]);

  const staffIds = staff.filter((member) => member.is_active).map((member) => member.id);
  const activeShiftTypes = shiftTypes.filter((shift) => shift.is_active);

  if (staffIds.length === 0 || activeShiftTypes.length === 0) {
    throw new Error("職員または勤務区分が未登録です。先に npm run db:seed を実行してください。");
  }

  const assignments = applyClosedDayOff(
    buildAssignmentsForMonth(2026, 5, activeShiftTypes, staffIds),
    buildMonthDateKeys(2026, 5),
    staffIds,
    holidaySettings,
  );

  await saveShiftSchedule(TARGET_MONTH, {
    status: "draft",
    assignments,
  });

  console.log(
    `Seeded ${TARGET_MONTH} shift schedule (${assignments.length} assignment(s), ${staffIds.length} staff)`,
  );
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
