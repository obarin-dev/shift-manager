import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/shift-schedule-db", () => ({
  getPublishedShiftScheduleByMonth: vi.fn(),
  getShiftScheduleByMonth: vi.fn(),
  saveShiftSchedule: vi.fn(),
}));

vi.mock("@/lib/staff-db", () => ({ listStaff: vi.fn() }));
vi.mock("@/lib/classroom-db", () => ({ listClassrooms: vi.fn() }));
vi.mock("@/lib/shift-type-db", () => ({ listShiftTypes: vi.fn() }));
vi.mock("@/lib/nursery-holiday-settings-db", () => ({ getHolidaySettings: vi.fn() }));

import { getSession } from "@/lib/auth-session";
import {
  getPublishedShiftScheduleByMonth,
  getShiftScheduleByMonth,
} from "@/lib/shift-schedule-db";
import { listStaff } from "@/lib/staff-db";
import { listClassrooms } from "@/lib/classroom-db";
import { listShiftTypes } from "@/lib/shift-type-db";
import { getHolidaySettings } from "@/lib/nursery-holiday-settings-db";
import { GET } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const STAFF_SESSION: SessionData = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const MOCK_SCHEDULE = {
  status: "published" as const,
  assignments: [{ staff_id: "s1", work_date: "2025-04-01", shift_type: "day" }],
};

const MOCK_STAFF = [{ id: "s1", name: "田中花子" }];
const MOCK_CLASSROOMS = [{ id: "c1", name: "ひよこ組" }];
const MOCK_SHIFT_TYPES = [{ id: "st1", code: "day", name: "日勤" }];
const MOCK_HOLIDAY_SETTINGS = { closed_weekdays: [0], closed_days: [], public_holidays_off: true };

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/shift-schedules");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/shift-schedules", () => {
  describe("published=true", () => {
    it("staff は published レスポンスに staff/classrooms/shiftTypes/holidaySettings が含まれる", async () => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
      vi.mocked(getPublishedShiftScheduleByMonth).mockResolvedValue(MOCK_SCHEDULE);
      vi.mocked(listStaff).mockResolvedValue(MOCK_STAFF as never);
      vi.mocked(listClassrooms).mockResolvedValue(MOCK_CLASSROOMS as never);
      vi.mocked(listShiftTypes).mockResolvedValue(MOCK_SHIFT_TYPES as never);
      vi.mocked(getHolidaySettings).mockResolvedValue(MOCK_HOLIDAY_SETTINGS as never);

      const res = await GET(makeRequest({ month: "2025-04", published: "true" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.status).toBe("published");
      expect(body.data.assignments).toEqual(MOCK_SCHEDULE.assignments);
      expect(body.data.staff).toEqual(MOCK_STAFF);
      expect(body.data.classrooms).toEqual(MOCK_CLASSROOMS);
      expect(body.data.shiftTypes).toEqual(MOCK_SHIFT_TYPES);
      expect(body.data.holidaySettings).toEqual(MOCK_HOLIDAY_SETTINGS);
    });

    it("published schedule がない場合は { data: null } を返し補助クエリを実行しない", async () => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
      vi.mocked(getPublishedShiftScheduleByMonth).mockResolvedValue(null);

      const res = await GET(makeRequest({ month: "2025-04", published: "true" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBeNull();
      expect(listStaff).not.toHaveBeenCalled();
      expect(listClassrooms).not.toHaveBeenCalled();
    });

    it("未認証は 401 が返る", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const res = await GET(makeRequest({ month: "2025-04", published: "true" }));
      expect(res.status).toBe(401);
    });
  });

  describe("published=false (draft)", () => {
    it("staff は draft スケジュールにアクセスできない（403）", async () => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);

      const res = await GET(makeRequest({ month: "2025-04" }));
      expect(res.status).toBe(403);
    });

    it("admin は draft スケジュールを取得できる", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(getShiftScheduleByMonth).mockResolvedValue(MOCK_SCHEDULE);

      const res = await GET(makeRequest({ month: "2025-04" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.status).toBe("published");
    });
  });
});
