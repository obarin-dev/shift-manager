import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { AuthAccount } from "@/lib/user-db";
import type { StaffRequestPayload } from "@/lib/staff-request-db";

// --- モジュールモック ---
vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/user-db", () => ({
  getAuthAccountByUserId: vi.fn(),
}));

vi.mock("@/lib/staff-request-db", () => ({
  createStaffRequest: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { getAuthAccountByUserId } from "@/lib/user-db";
import { createStaffRequest } from "@/lib/staff-request-db";
import { POST } from "../route";

// テスト用フィクスチャ
const STAFF_SESSION: SessionData = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const STAFF_ACCOUNT: AuthAccount = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  staffId: "staff-1",
  role: "staff",
  roleLabel: "スタッフ",
  email: "staff@example.com",
  displayName: "テストスタッフ",
};

const VALID_BODY = {
  date: "2026-07-10",
  type: "休み希望",
  time: "終日",
  memo: "",
};

const CREATED_REQUEST: StaffRequestPayload = {
  id: "req-1",
  date: "2026-07-10",
  type: "休み希望",
  time: "終日",
  memo: "",
  status: "提出済み",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/staff-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
  vi.mocked(getAuthAccountByUserId).mockResolvedValue(STAFF_ACCOUNT);
  vi.mocked(createStaffRequest).mockResolvedValue(CREATED_REQUEST);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/staff-requests", () => {
  it("正常系: 201 と作成された申請を返す", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toMatchObject({ id: "req-1", date: "2026-07-10" });
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("admin ロール: 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...STAFF_SESSION, role: "admin" });
    vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...STAFF_ACCOUNT, role: "admin" });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("manager ロール: 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...STAFF_SESSION, role: "manager" });
    vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...STAFF_ACCOUNT, role: "manager" });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("重複申請: 409 を返す", async () => {
    vi.mocked(createStaffRequest).mockResolvedValue("duplicate");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("duplicate_request");
  });

  it("malformed JSON: 400 を返す", async () => {
    const req = new Request("http://localhost/api/staff-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("空ボディ: 400 を返す", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("無効日付 2026-02-30: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, date: "2026-02-30" }));
    expect(res.status).toBe(400);
  });

  it("無効な time 値: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, time: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("無効な type 値: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, type: "unknown" }));
    expect(res.status).toBe(400);
  });

  it("date フォーマット違反: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, date: "20260710" }));
    expect(res.status).toBe(400);
  });

  it("memo が 200 文字超: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, memo: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("セッションあり・アカウント取得失敗: 401 を返す", async () => {
    vi.mocked(getAuthAccountByUserId).mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("当日日付: 400 を返す", async () => {
    // getTodayJst() が返す値をモックして「今日」を固定する
    const { getTodayJst } = await import("@/lib/nursery-time");
    const today = getTodayJst();
    const res = await POST(makeRequest({ ...VALID_BODY, date: today }));
    expect(res.status).toBe(400);
  });

  it("過去日: 400 を返す", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, date: "2020-01-01" }));
    expect(res.status).toBe(400);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(createStaffRequest).mockRejectedValue(new Error("db error"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
