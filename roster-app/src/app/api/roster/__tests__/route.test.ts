import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/roster-db", () => ({
  getRosterSheetByDate: vi.fn(),
  normalizeRosterSheetPayload: vi.fn(),
  saveRosterSheet: vi.fn(),
}));

vi.mock("@/lib/roster-boundary", () => ({
  getClassroomsForRoster: vi.fn(),
}));

vi.mock("@/lib/nursery-time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/nursery-time")>();
  return { ...actual, getTodayJst: vi.fn(() => "2026-07-07") };
});

import { getSession } from "@/lib/auth-session";
import {
  getRosterSheetByDate,
  normalizeRosterSheetPayload,
  saveRosterSheet,
} from "@/lib/roster-db";
import { getClassroomsForRoster } from "@/lib/roster-boundary";
import { GET, PUT } from "../route";

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

const SAMPLE_SHEET = {
  rows: [{ id: "row-1", kind: "schedule" as const, timeSlot: "09:00" }],
  assignments: [],
  todayChildCounts: {},
  slotCountsByRowAndClass: {},
};

function makeGet(date?: string): Request {
  const url = date
    ? `http://localhost/api/roster?date=${date}`
    : "http://localhost/api/roster";
  return new Request(url);
}

function makePut(date: string | undefined, body: unknown): Request {
  const url = date
    ? `http://localhost/api/roster?date=${date}`
    : "http://localhost/api/roster";
  return new Request(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/roster", () => {
  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(makeGet("2026-07-07"));
    expect(res.status).toBe(401);
  });

  it("date が不正な形式なら 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeGet("2026/07/07"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_date");
  });

  it("date が未指定なら 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
  });

  it("staff が当日以外を要求すると 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    const res = await GET(makeGet("2026-07-08"));
    expect(res.status).toBe(403);
    expect(getRosterSheetByDate).not.toHaveBeenCalled();
  });

  it("staff は当日分なら取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    vi.mocked(getRosterSheetByDate).mockResolvedValue(SAMPLE_SHEET);
    const res = await GET(makeGet("2026-07-07"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(SAMPLE_SHEET);
  });

  it("admin は任意の日付を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterSheetByDate).mockResolvedValue(SAMPLE_SHEET);
    const res = await GET(makeGet("2026-07-20"));
    expect(res.status).toBe(200);
    expect(getRosterSheetByDate).toHaveBeenCalledWith("2026-07-20");
  });

  it("保存データが無ければ data: null を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterSheetByDate).mockResolvedValue(null);
    const res = await GET(makeGet("2026-07-07"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toBeNull();
  });

  it("DB/境界 例外は 500 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getRosterSheetByDate).mockRejectedValue(new Error("boundary error"));
    const res = await GET(makeGet("2026-07-07"));
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/roster", () => {
  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PUT(makePut("2026-07-07", SAMPLE_SHEET));
    expect(res.status).toBe(401);
  });

  it("staff は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    const res = await PUT(makePut("2026-07-07", SAMPLE_SHEET));
    expect(res.status).toBe(403);
    expect(saveRosterSheet).not.toHaveBeenCalled();
  });

  it("date が不正なら 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await PUT(makePut("bad-date", SAMPLE_SHEET));
    expect(res.status).toBe(400);
  });

  it("JSON が壊れていれば 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await PUT(makePut("2026-07-07", "{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_payload");
  });

  it("ペイロードが不正なら 400 を返し保存しない", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomsForRoster).mockResolvedValue([]);
    vi.mocked(normalizeRosterSheetPayload).mockReturnValue(null);
    const res = await PUT(makePut("2026-07-07", { foo: "bar" }));
    expect(res.status).toBe(400);
    expect(saveRosterSheet).not.toHaveBeenCalled();
  });

  it("正常なら保存して 200 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomsForRoster).mockResolvedValue([]);
    vi.mocked(normalizeRosterSheetPayload).mockReturnValue(SAMPLE_SHEET);
    vi.mocked(saveRosterSheet).mockResolvedValue(undefined);
    const res = await PUT(makePut("2026-07-07", SAMPLE_SHEET));
    expect(res.status).toBe(200);
    expect(saveRosterSheet).toHaveBeenCalledWith("2026-07-07", SAMPLE_SHEET);
  });

  it("保存時の例外は 500 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomsForRoster).mockResolvedValue([]);
    vi.mocked(normalizeRosterSheetPayload).mockReturnValue(SAMPLE_SHEET);
    vi.mocked(saveRosterSheet).mockRejectedValue(new Error("db error"));
    const res = await PUT(makePut("2026-07-07", SAMPLE_SHEET));
    expect(res.status).toBe(500);
  });
});
