/**
 * 体制表(roster)が外部システム(本体shiftmanager)に依存する唯一の入り口。
 * 本体の /api/classrooms と /api/shift-schedules, /api/shift-types をHTTPで呼び出す。
 * 呼び出し先ホストは本番ではCaddy越しの同一オリジン、開発では next.config.ts の
 * rewrites または MAIN_APP_URL 環境変数で切り替える。
 */
import { getForwardedCookieHeader } from "@/lib/auth-session";
import { sortClassrooms, type Classroom } from "@/lib/classroom-helpers";

const MAIN_APP_URL = process.env.MAIN_APP_URL ?? "http://localhost:3000";

async function fetchFromMainApp(path: string): Promise<Response> {
  const cookie = await getForwardedCookieHeader();
  return fetch(`${MAIN_APP_URL}${path}`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });
}

export async function getClassroomsForRoster(): Promise<Classroom[]> {
  const res = await fetchFromMainApp("/api/classrooms");
  if (!res.ok) {
    throw new Error(`classrooms_boundary_failed: ${res.status}`);
  }
  const body = (await res.json()) as { data?: Classroom[] };
  return sortClassrooms(body.data ?? []);
}

export type ConfirmedShiftPresence = {
  staffId: string;
  startMinutes: number;
  endMinutes: number;
};

export type ConfirmedShiftResult =
  | { hasUsableSchedule: true; presences: ConfirmedShiftPresence[] }
  | { hasUsableSchedule: false; presences: [] };

const USABLE_STATUSES = new Set(["published", "confirmed", "checking"]);

type ShiftAssignment = { staff_id: string; work_date: string; shift_type: string };
type ShiftTypeDefinition = { id: string; start: string; end: string };

function timeStringToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + (minutes ?? 0);
}

export async function getConfirmedShiftPresences(dateKey: string): Promise<ConfirmedShiftResult> {
  const targetMonth = dateKey.slice(0, 7);

  const scheduleRes = await fetchFromMainApp(`/api/shift-schedules?month=${targetMonth}`);
  if (!scheduleRes.ok) {
    throw new Error(`shift_schedules_boundary_failed: ${scheduleRes.status}`);
  }
  const scheduleBody = (await scheduleRes.json()) as {
    data: { status: string; assignments: ShiftAssignment[] } | null;
  };

  if (!scheduleBody.data || !USABLE_STATUSES.has(scheduleBody.data.status)) {
    return { hasUsableSchedule: false, presences: [] };
  }

  const dayAssignments = scheduleBody.data.assignments.filter(
    (a) => a.work_date === dateKey && a.shift_type !== "off",
  );
  if (dayAssignments.length === 0) {
    return { hasUsableSchedule: true, presences: [] };
  }

  const shiftTypesRes = await fetchFromMainApp("/api/shift-types");
  if (!shiftTypesRes.ok) {
    throw new Error(`shift_types_boundary_failed: ${shiftTypesRes.status}`);
  }
  const shiftTypesBody = (await shiftTypesRes.json()) as { data?: ShiftTypeDefinition[] };
  const shiftTypeById = new Map((shiftTypesBody.data ?? []).map((t) => [t.id, t]));

  const presences: ConfirmedShiftPresence[] = [];
  for (const assignment of dayAssignments) {
    const shiftType = shiftTypeById.get(assignment.shift_type);
    if (!shiftType) continue;
    presences.push({
      staffId: assignment.staff_id,
      startMinutes: timeStringToMinutes(shiftType.start),
      endMinutes: timeStringToMinutes(shiftType.end),
    });
  }

  return { hasUsableSchedule: true, presences };
}
