import { generateShiftAssignmentsJson, isGeminiConfigured } from "@/lib/gemini-client";
import { listCalendarEntries } from "@/lib/calendar-entry-db";
import { getHolidaySettings } from "@/lib/nursery-holiday-settings-db";
import { getPrimaryNurseryName } from "@/lib/nursery-db";
import { isClosedDate } from "@/lib/holiday-settings";
import type { ShiftTypeDefinition } from "@/lib/nursery-helpers";
import { getJobTypeLabel } from "@/lib/staff-helpers";
import type { StaffMember } from "@/lib/staff-helpers";
import {
  buildAssignmentsForMonth,
  buildMonthDateKeys,
  parseTargetMonth,
  type ShiftAssignment,
} from "@/lib/shift-helpers";
import { normalizeShiftCellValue, SHIFT_CELL_OFF } from "@/lib/shift-schedule-options";
import { getActiveNurseryId } from "@/lib/nursery-db";
import { listAdminStaffRequestGroupsForMonth } from "@/lib/staff-request-db";
import { mergeStaffRequestsIntoAssignments } from "@/lib/staff-request-shift-mapper";
import { listShiftTypes } from "@/lib/shift-type-db";
import { listStaff } from "@/lib/staff-db";

export type ShiftScheduleAiResult = {
  assignments: ShiftAssignment[];
  source: "gemini" | "fallback";
  warnings: string[];
};

function formatStaffLine(member: StaffMember) {
  const hours =
    member.work_availability.start && member.work_availability.end
      ? `${member.work_availability.start}-${member.work_availability.end}`
      : "未設定";
  const license = member.has_nursery_teacher_license ? "資格あり" : "資格なし";
  return `- staff_id=${member.id}, 名前=${member.name}, 職種=${getJobTypeLabel(member.job_type)}, ${license}, 勤務可能=${hours}`;
}

function formatShiftTypeLine(shift: ShiftTypeDefinition) {
  return `- shift_type=${shift.id}, 名称=${shift.name}, 時間=${shift.start}-${shift.end}`;
}

function formatClosedDates(dateKeys: string[], holidaySettings: Awaited<ReturnType<typeof getHolidaySettings>>) {
  return dateKeys
    .filter((dateKey) => isClosedDate(dateKey, holidaySettings))
    .map((dateKey) => `- ${dateKey}（休園）`)
    .join("\n");
}

function buildPrompt(
  targetMonth: string,
  nurseryName: string,
  staff: StaffMember[],
  shiftTypes: ShiftTypeDefinition[],
  dateKeys: string[],
  holidaySettings: Awaited<ReturnType<typeof getHolidaySettings>>,
  events: Awaited<ReturnType<typeof listCalendarEntries>>,
) {
  const activeStaff = staff.filter((member) => member.is_active);
  const activeShiftTypes = shiftTypes.filter((shift) => shift.is_active);
  const eventLines = events
    .map((entry) => {
      const time =
        entry.start_time && entry.end_time
          ? `${entry.start_time}-${entry.end_time}`
          : entry.start_time ?? "";
      return `- ${entry.entry_date} ${entry.title}${time ? ` (${time})` : ""}`;
    })
    .join("\n");

  return `
あなたは保育園の月間勤務表を作成するアシスタントです。
${nurseryName} の ${targetMonth} 分の勤務表案を JSON で出力してください。

## 職員（staff_id をそのまま使う）
${activeStaff.map(formatStaffLine).join("\n")}

## 勤務区分（shift_type には id を使う。"off" は休み）
${activeShiftTypes.map(formatShiftTypeLine).join("\n")}

## 対象日（${dateKeys.length}日）
${dateKeys.join(", ")}

## 休園日（必ず shift_type="off"）
${formatClosedDates(dateKeys, holidaySettings) || "なし"}

## 行事・イベント（参考）
${eventLines || "なし"}

## ルール（必ず守る）
1. 休園日は全職員 shift_type="off"
2. 日曜日も原則 shift_type="off"（休園日リストに含まれる場合）
3. shift_type は "off" または上記勤務区分 id のみ
4. 各職員×各日付について1件ずつ assignments に含める
5. 早番・日勤・遅番が特定の職員に偏りすぎないようにする
6. 保育士資格者を平日の勤務に優先的に入れる
7. パート職員は work_availability の時間帯に合う区分を優先する

出力形式:
{
  "assignments": [
    { "staff_id": "...", "work_date": "YYYY-MM-DD", "shift_type": "off または勤務区分id" }
  ],
  "notes": ["作成時の注意点（任意）"]
}
`.trim();
}

function sanitizeAssignments(
  rawAssignments: ShiftAssignment[],
  year: number,
  month: number,
  staffIds: string[],
  dateKeys: string[],
  shiftTypes: ShiftTypeDefinition[],
  holidaySettings: Awaited<ReturnType<typeof getHolidaySettings>>,
): ShiftAssignment[] {
  const validShiftIds = new Set(shiftTypes.filter((shift) => shift.is_active).map((shift) => shift.id));
  const rawMap = new Map<string, string>();

  for (const assignment of rawAssignments) {
    if (!staffIds.includes(assignment.staff_id) || !dateKeys.includes(assignment.work_date)) {
      continue;
    }

    let shiftType = assignment.shift_type;
    if (shiftType !== SHIFT_CELL_OFF && !validShiftIds.has(shiftType)) {
      shiftType = SHIFT_CELL_OFF;
    }

    rawMap.set(`${assignment.staff_id}:${assignment.work_date}`, shiftType);
  }

  const fallbackAssignments = buildAssignmentsForMonth(year, month, shiftTypes, staffIds);
  const fallbackMap = new Map(
    fallbackAssignments.map((assignment) => [
      `${assignment.staff_id}:${assignment.work_date}`,
      assignment.shift_type,
    ]),
  );

  const result: ShiftAssignment[] = [];

  for (const staffId of staffIds) {
    for (const dateKey of dateKeys) {
      const key = `${staffId}:${dateKey}`;

      if (isClosedDate(dateKey, holidaySettings)) {
        result.push({ staff_id: staffId, work_date: dateKey, shift_type: SHIFT_CELL_OFF });
        continue;
      }

      const candidate = rawMap.get(key) ?? fallbackMap.get(key) ?? SHIFT_CELL_OFF;
      const normalized = normalizeShiftCellValue(candidate, shiftTypes) ?? SHIFT_CELL_OFF;
      result.push({ staff_id: staffId, work_date: dateKey, shift_type: normalized });
    }
  }

  return result;
}

async function applyStaffRequests(
  targetMonth: string,
  assignments: ShiftAssignment[],
  shiftTypes: ShiftTypeDefinition[],
) {
  const nurseryId = await getActiveNurseryId();
  const groups = await listAdminStaffRequestGroupsForMonth(nurseryId, targetMonth);
  if (groups.length === 0) {
    return assignments;
  }
  return mergeStaffRequestsIntoAssignments(assignments, groups, shiftTypes);
}

export async function generateShiftScheduleWithAi(targetMonth: string): Promise<ShiftScheduleAiResult> {
  const { year, month } = parseTargetMonth(targetMonth);
  const dateKeys = buildMonthDateKeys(year, month);
  const from = dateKeys[0]!;
  const to = dateKeys[dateKeys.length - 1]!;

  const [nurseryName, staff, shiftTypes, holidaySettings, events] = await Promise.all([
    getPrimaryNurseryName(),
    listStaff(),
    listShiftTypes(),
    getHolidaySettings(),
    listCalendarEntries({ from, to }),
  ]);

  const activeStaff = staff.filter((member) => member.is_active);
  const staffIds = activeStaff.map((member) => member.id);
  const activeShiftTypes = shiftTypes.filter((shift) => shift.is_active);

  if (staffIds.length === 0 || activeShiftTypes.length === 0) {
    throw new Error("missing_master_data");
  }

  const fallbackAssignments = sanitizeAssignments(
    buildAssignmentsForMonth(year, month, shiftTypes, staffIds),
    year,
    month,
    staffIds,
    dateKeys,
    shiftTypes,
    holidaySettings,
  );

  if (!isGeminiConfigured()) {
    return {
      assignments: await applyStaffRequests(targetMonth, fallbackAssignments, shiftTypes),
      source: "fallback",
      warnings: ["GEMINI_API_KEY が未設定のため、ルールベースで作成しました。"],
    };
  }

  try {
    const prompt = buildPrompt(
      targetMonth,
      nurseryName,
      staff,
      shiftTypes,
      dateKeys,
      holidaySettings,
      events,
    );
    const response = await generateShiftAssignmentsJson(prompt);
    const assignments = sanitizeAssignments(
      response.assignments,
      year,
      month,
      staffIds,
      dateKeys,
      shiftTypes,
      holidaySettings,
    );

    return {
      assignments: await applyStaffRequests(targetMonth, assignments, shiftTypes),
      source: "gemini",
      warnings: response.notes ?? [],
    };
  } catch (error) {
    console.error("Gemini shift generation failed:", error);
    const status = (error as { status?: number }).status;
    const message =
      status === 429
        ? "Gemini API の無料枠上限に達しています。Google AI Studio でお支払い情報を設定するか、しばらく待ってから再試行してください。ルールベースで作成しました。"
        : "AI生成に失敗したため、ルールベースで作成しました。";
    return {
      assignments: await applyStaffRequests(targetMonth, fallbackAssignments, shiftTypes),
      source: "fallback",
      warnings: [message],
    };
  }
}
