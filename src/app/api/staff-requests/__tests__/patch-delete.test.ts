import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { AuthAccount } from "@/lib/user-db";
import type { StaffRequestPayload } from "@/lib/staff-request-db";

// --- モジュールモック ---
vi.mock("@/lib/auth-session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/user-db", () => ({
  getAuthAccountByUserId: vi.fn(),
}));

vi.mock("@/lib/staff-request-db", () => ({
  updateStaffRequest: vi.fn(),
  deleteStaffRequest: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { getAuthAccountByUserId } from "@/lib/user-db";
import { updateStaffRequest, deleteStaffRequest } from "@/lib/staff-request-db";
import { PATCH, DELETE } from "../[id]/route";

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

const UPDATED_REQUEST: StaffRequestPayload = {
  id: "req-1",
  date: "2026-07-10",
  type: "休み希望",
  time: "終日",
  memo: "",
  status: "提出済み",
};

const VALID_BODY = {
  date: "2026-07-10",
  type: "休み希望",
  time: "終日",
  memo: "",
};

function makeRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: unknown): Request {
  return new Request(`http://localhost/api/staff-requests/req-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/staff-requests/req-1`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
  vi.mocked(getAuthAccountByUserId).mockResolvedValue(STAFF_ACCOUNT);
  vi.mocked(updateStaffRequest).mockResolvedValue(UPDATED_REQUEST);
  vi.mocked(deleteStaffRequest).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────
describe("PATCH /api/staff-requests/[id]", () => {
  it("正常系: 200 と更新後の申請を返す", async () => {
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ id: "req-1" });
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(401);
  });

  it("admin ロールでも 200 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...STAFF_SESSION, role: "admin" });
    vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...STAFF_ACCOUNT, role: "admin" });
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
  });

  it("存在しない申請 / 他ユーザーの申請: 404 を返す", async () => {
    vi.mocked(updateStaffRequest).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-999"));
    expect(res.status).toBe(404);
  });

  it("承認済み申請 (locked): 409 を返す", async () => {
    vi.mocked(updateStaffRequest).mockResolvedValue("locked");
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("request_locked");
  });

  it("重複申請: 409 を返す", async () => {
    vi.mocked(updateStaffRequest).mockResolvedValue("duplicate");
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("duplicate_request");
  });

  it("不正ボディ (空オブジェクト): 400 を返す", async () => {
    const res = await PATCH(makePatchRequest({}), makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("malformed JSON: 400 を返す", async () => {
    const req = new Request("http://localhost/api/staff-requests/req-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ bad",
    });
    const res = await PATCH(req, makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("無効日付 2026-02-30: 400 を返す", async () => {
    const res = await PATCH(makePatchRequest({ ...VALID_BODY, date: "2026-02-30" }), makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("無効な time 値: 400 を返す", async () => {
    const res = await PATCH(makePatchRequest({ ...VALID_BODY, time: "xxx" }), makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("セッションあり・アカウント取得失敗: 401 を返す", async () => {
    vi.mocked(getAuthAccountByUserId).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(401);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(updateStaffRequest).mockRejectedValue(new Error("db error"));
    const res = await PATCH(makePatchRequest(VALID_BODY), makeRouteContext("req-1"));
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
describe("DELETE /api/staff-requests/[id]", () => {
  it("正常系: 200 ok を返す", async () => {
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(401);
  });

  it("admin ロールでも 200 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...STAFF_SESSION, role: "admin" });
    vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...STAFF_ACCOUNT, role: "admin" });
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
  });

  it("存在しない申請: 404 を返す", async () => {
    vi.mocked(deleteStaffRequest).mockResolvedValue(false);
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-999"));
    expect(res.status).toBe(404);
  });

  it("承認済み申請 (locked): 409 を返す", async () => {
    vi.mocked(deleteStaffRequest).mockResolvedValue("locked");
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("request_locked");
  });

  it("並行削除（他プロセスが先に削除）: 500 でなく 404 を返す", async () => {
    // deleteStaffRequest が false を返す = findFirst 後に他プロセスが削除した状態と等価
    vi.mocked(deleteStaffRequest).mockResolvedValue(false);
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(500);
  });

  it("セッションあり・アカウント取得失敗: 401 を返す", async () => {
    vi.mocked(getAuthAccountByUserId).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(401);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(deleteStaffRequest).mockRejectedValue(new Error("db error"));
    const res = await DELETE(makeDeleteRequest(), makeRouteContext("req-1"));
    expect(res.status).toBe(500);
  });
});
