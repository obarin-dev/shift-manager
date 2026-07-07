import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/roster-draft", () => ({
  generateRosterDraftFromShift: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { generateRosterDraftFromShift } from "@/lib/roster-draft";
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

const DRAFT_RESULT = {
  hasPublishedSchedule: true,
  draft: {
    rows: [{ id: "row-1", kind: "schedule", timeSlot: "09:00" }],
    assignments: [],
    todayChildCounts: {},
    slotCountsByRowAndClass: {},
  },
  staffPresences: [],
};

function makeRequest(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/roster/draft", () => {
  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-07-07"));
    expect(res.status).toBe(401);
  });

  it("staff ロールは 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-07-07"));
    expect(res.status).toBe(403);
  });

  it("date パラメータがない場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeRequest("http://localhost/api/roster/draft"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_date");
  });

  it("date フォーマットが不正な場合は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-7-7"));
    expect(res.status).toBe(400);
  });

  it("正常なリクエストはドラフト結果を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(generateRosterDraftFromShift).mockResolvedValue(DRAFT_RESULT);
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-07-07"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasPublishedSchedule).toBe(true);
    expect(json.draft).toBeDefined();
    expect(generateRosterDraftFromShift).toHaveBeenCalledWith("2026-07-07");
  });

  it("シフト表がない日は hasPublishedSchedule: false を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(generateRosterDraftFromShift).mockResolvedValue({
      hasPublishedSchedule: false,
      draft: null,
      staffPresences: [],
    });
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-07-07"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasPublishedSchedule).toBe(false);
    expect(json.draft).toBeNull();
  });

  it("内部エラーは 500 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(generateRosterDraftFromShift).mockRejectedValue(new Error("db error"));
    const res = await GET(makeRequest("http://localhost/api/roster/draft?date=2026-07-07"));
    expect(res.status).toBe(500);
  });
});
