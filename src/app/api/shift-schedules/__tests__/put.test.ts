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
import { getShiftScheduleByMonth, saveShiftSchedule } from "@/lib/shift-schedule-db";
import { PUT } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const MANAGER_SESSION: SessionData = {
  userId: "user-manager-1",
  nurseryId: "nursery-hoshinoko",
  role: "manager",
  email: "manager@example.com",
};

const STAFF_SESSION: SessionData = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const VALID_ASSIGNMENTS = [
  { staff_id: "s1", work_date: "2025-04-01", shift_type: "off" },
  { staff_id: "s1", work_date: "2025-04-02", shift_type: "shift-day" },
];

function makeRequest(params: Record<string, string>, body: unknown) {
  const url = new URL("http://localhost/api/shift-schedules");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("PUT /api/shift-schedules", () => {
  describe("認証・認可", () => {
    it("未認証は 401", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const res = await PUT(makeRequest({ month: "2025-04" }, { status: "draft", assignments: [] }));
      expect(res.status).toBe(401);
    });

    it("staff は 403", async () => {
      vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
      const res = await PUT(makeRequest({ month: "2025-04" }, { status: "draft", assignments: [] }));
      expect(res.status).toBe(403);
    });

    it("manager が published を保存しようとすると 403", async () => {
      vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);
      vi.mocked(getShiftScheduleByMonth).mockResolvedValue(null);
      const res = await PUT(
        makeRequest({ month: "2025-04" }, { status: "published", assignments: [] }),
      );
      expect(res.status).toBe(403);
    });

    it("manager は published 済みスケジュールを上書きできない（403）", async () => {
      vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);
      vi.mocked(getShiftScheduleByMonth).mockResolvedValue({
        status: "published",
        assignments: [],
      });
      const res = await PUT(
        makeRequest({ month: "2025-04" }, { status: "draft", assignments: [] }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("バリデーション", () => {
    it("month パラメータなしは 400", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      const res = await PUT(makeRequest({}, { status: "draft", assignments: [] }));
      expect(res.status).toBe(400);
    });

    it("不正な month フォーマットは 400", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      const res = await PUT(
        makeRequest({ month: "2025-4" }, { status: "draft", assignments: [] }),
      );
      expect(res.status).toBe(400);
    });

    it("assignments が配列でない場合は 400", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      const res = await PUT(makeRequest({ month: "2025-04" }, { status: "draft", assignments: "bad" }));
      expect(res.status).toBe(400);
    });

    it("shift_type が空文字のアサインメントは 400", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      const res = await PUT(
        makeRequest({ month: "2025-04" }, {
          status: "draft",
          assignments: [{ staff_id: "s1", work_date: "2025-04-01", shift_type: "" }],
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("正常系", () => {
    it("admin が draft で保存できる", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(saveShiftSchedule).mockResolvedValue(undefined);

      const res = await PUT(
        makeRequest({ month: "2025-04" }, { status: "draft", assignments: VALID_ASSIGNMENTS }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(saveShiftSchedule).toHaveBeenCalledWith("2025-04", {
        status: "draft",
        assignments: VALID_ASSIGNMENTS,
      });
    });

    it("admin が published で保存できる", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(saveShiftSchedule).mockResolvedValue(undefined);

      const res = await PUT(
        makeRequest({ month: "2025-04" }, { status: "published", assignments: VALID_ASSIGNMENTS }),
      );
      expect(res.status).toBe(200);
    });

    it("shift_type が 'off' のアサインメントを正常に受け付ける", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(saveShiftSchedule).mockResolvedValue(undefined);

      const res = await PUT(
        makeRequest({ month: "2025-04" }, {
          status: "draft",
          assignments: [{ staff_id: "s1", work_date: "2025-04-01", shift_type: "off" }],
        }),
      );
      expect(res.status).toBe(200);
    });

    it("空の assignments で保存できる", async () => {
      vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
      vi.mocked(saveShiftSchedule).mockResolvedValue(undefined);

      const res = await PUT(
        makeRequest({ month: "2025-04" }, { status: "draft", assignments: [] }),
      );
      expect(res.status).toBe(200);
    });
  });
});
