import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { NotificationPayload } from "@/lib/notification-db";

vi.mock("@/lib/auth-session", () => ({
  getSession: vi.fn(),
  isAdminOrManager: vi.fn((role: string) => role === "admin" || role === "manager"),
}));

vi.mock("@/lib/notification-db", () => ({
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { listNotifications, markAllNotificationsRead } from "@/lib/notification-db";
import { GET, PATCH } from "../route";

const STAFF_SESSION: SessionData = {
  userId: "staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const SAMPLE_NOTIFICATIONS: NotificationPayload[] = [
  {
    id: "notif-1",
    type: "shift_published",
    title: "2026年7月の勤務表が公開されました",
    body: null,
    isRead: false,
    relatedId: "2026-07",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
  vi.mocked(listNotifications).mockResolvedValue(SAMPLE_NOTIFICATIONS);
  vi.mocked(markAllNotificationsRead).mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/notifications", () => {
  it("正常系: 通知一覧を返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].type).toBe("shift_published");
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(listNotifications).mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/notifications", () => {
  it("正常系: ok を返す", async () => {
    const res = await PATCH();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(vi.mocked(markAllNotificationsRead)).toHaveBeenCalledWith(STAFF_SESSION.userId);
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH();
    expect(res.status).toBe(401);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(markAllNotificationsRead).mockRejectedValue(new Error("db error"));
    const res = await PATCH();
    expect(res.status).toBe(500);
  });
});
