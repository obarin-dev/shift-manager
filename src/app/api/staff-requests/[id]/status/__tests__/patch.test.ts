import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { AuthAccount } from "@/lib/user-db";

vi.mock("@/lib/auth-session", () => ({
  getSession: vi.fn(),
  isAdminOrManager: vi.fn((role: string) => role === "admin" || role === "manager"),
}));

vi.mock("@/lib/user-db", () => ({
  getAuthAccountByUserId: vi.fn(),
}));

vi.mock("@/lib/staff-request-db", () => ({
  findRequestForStatusUpdate: vi.fn(),
  setRequestStatus: vi.fn(),
}));

vi.mock("@/lib/notification-db", () => ({
  createRequestStatusNotification: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { getAuthAccountByUserId } from "@/lib/user-db";
import { findRequestForStatusUpdate, setRequestStatus } from "@/lib/staff-request-db";
import { createRequestStatusNotification } from "@/lib/notification-db";
import { PATCH } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const ADMIN_ACCOUNT: AuthAccount = {
  userId: "admin-1",
  nurseryId: "nursery-hoshinoko",
  staffId: "admin-1",
  role: "admin",
  roleLabel: "管理者",
  email: "admin@example.com",
  displayName: "管理者",
};

const EXISTING_REQUEST = {
  id: "req-1",
  staff_id: "staff-1",
  status: "submitted",
};

function makeRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: unknown): Request {
  return new Request("http://localhost/api/staff-requests/req-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
  vi.mocked(getAuthAccountByUserId).mockResolvedValue(ADMIN_ACCOUNT);
  vi.mocked(findRequestForStatusUpdate).mockResolvedValue(EXISTING_REQUEST);
  vi.mocked(setRequestStatus).mockResolvedValue({ id: "req-1", status: "approved" });
  vi.mocked(createRequestStatusNotification).mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/staff-requests/[id]/status", () => {
  it("正常系: 承認 → 200 を返す", async () => {
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("approved");
    expect(vi.mocked(createRequestStatusNotification)).toHaveBeenCalledWith(
      "nursery-hoshinoko",
      "staff-1",
      "req-1",
      "approved",
    );
  });

  it("正常系: needs_review → 200 を返す", async () => {
    vi.mocked(setRequestStatus).mockResolvedValue({ id: "req-1", status: "needs_review" });
    const res = await PATCH(makePatchRequest({ status: "needs_review" }), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(401);
  });

  it("staff ロール: 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, role: "staff" });
    vi.mocked(getAuthAccountByUserId).mockResolvedValue({ ...ADMIN_ACCOUNT, role: "staff" });
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(403);
  });

  it("自己承認: 403 を返す", async () => {
    vi.mocked(findRequestForStatusUpdate).mockResolvedValue({
      id: "req-1",
      staff_id: "admin-1",
      status: "submitted",
    });
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(403);
  });

  it("取り下げ (submitted): 200 を返す", async () => {
    vi.mocked(setRequestStatus).mockResolvedValue({ id: "req-1", status: "submitted" });
    const res = await PATCH(makePatchRequest({ status: "submitted" }), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
    expect(vi.mocked(createRequestStatusNotification)).not.toHaveBeenCalled();
  });

  it("同一ステータスへの更新: 通知を送らない", async () => {
    vi.mocked(findRequestForStatusUpdate).mockResolvedValue({
      id: "req-1",
      staff_id: "staff-1",
      status: "approved",
    });
    vi.mocked(setRequestStatus).mockResolvedValue({ id: "req-1", status: "approved" });
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(200);
    expect(vi.mocked(createRequestStatusNotification)).not.toHaveBeenCalled();
  });

  it("不正なステータス: 400 を返す", async () => {
    const res = await PATCH(makePatchRequest({ status: "deleted" }), makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("存在しない申請: 404 を返す", async () => {
    vi.mocked(findRequestForStatusUpdate).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-999"));
    expect(res.status).toBe(404);
  });

  it("malformed JSON: 400 を返す", async () => {
    const req = new Request("http://localhost/api/staff-requests/req-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ bad",
    });
    const res = await PATCH(req, makeRouteContext("req-1"));
    expect(res.status).toBe(400);
  });

  it("DB 例外: 500 を返す", async () => {
    vi.mocked(setRequestStatus).mockRejectedValue(new Error("db error"));
    const res = await PATCH(makePatchRequest({ status: "approved" }), makeRouteContext("req-1"));
    expect(res.status).toBe(500);
  });
});
