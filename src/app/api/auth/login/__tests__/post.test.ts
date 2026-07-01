import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/user-db", () => ({
  findActiveUserByEmail: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  setSessionCookie: vi.fn(),
  AuthConfigError: class AuthConfigError extends Error {},
}));

import { findActiveUserByEmail, verifyPassword } from "@/lib/user-db";
import { setSessionCookie } from "@/lib/auth-session";
import { POST } from "../route";

const STAFF_RECORD = {
  id: "staff-1",
  nursery_id: "nursery-hoshinoko",
  name: "テストスタッフ",
  email: "staff@example.com",
  password_hash: "$2b$10$hashedpassword",
  role: "staff" as const,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(findActiveUserByEmail).mockResolvedValue(STAFF_RECORD as never);
  vi.mocked(verifyPassword).mockResolvedValue(true);
  vi.mocked(setSessionCookie).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/auth/login", () => {
  it("正常系: Staff テーブルから認証成功で 200 を返す", async () => {
    const res = await POST(makeRequest({ email: "staff@example.com", password: "password" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(setSessionCookie).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "staff-1", role: "staff" }),
    );
  });

  it("メールアドレスが存在しない: 401", async () => {
    vi.mocked(findActiveUserByEmail).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "nobody@example.com", password: "password" }));
    expect(res.status).toBe(401);
  });

  it("パスワード不一致: 401", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const res = await POST(makeRequest({ email: "staff@example.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("Staff に password_hash がない: 401", async () => {
    vi.mocked(findActiveUserByEmail).mockResolvedValue({ ...STAFF_RECORD, password_hash: null } as never);
    const res = await POST(makeRequest({ email: "staff@example.com", password: "password" }));
    expect(res.status).toBe(401);
  });

  it("Staff に role がない: 401", async () => {
    vi.mocked(findActiveUserByEmail).mockResolvedValue({ ...STAFF_RECORD, role: null } as never);
    const res = await POST(makeRequest({ email: "staff@example.com", password: "password" }));
    expect(res.status).toBe(401);
  });

  it("email が空: 401", async () => {
    const res = await POST(makeRequest({ email: "", password: "password" }));
    expect(res.status).toBe(401);
  });

  it("password が空: 401", async () => {
    const res = await POST(makeRequest({ email: "staff@example.com", password: "" }));
    expect(res.status).toBe(401);
  });

  it("malformed JSON: 400", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("空ボディ: 400", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("DB 例外: 500", async () => {
    vi.mocked(findActiveUserByEmail).mockRejectedValue(new Error("db error"));
    const res = await POST(makeRequest({ email: "staff@example.com", password: "password" }));
    expect(res.status).toBe(500);
  });

  it("admin ロールでも認証成功: 200", async () => {
    vi.mocked(findActiveUserByEmail).mockResolvedValue({ ...STAFF_RECORD, role: "admin" } as never);
    const res = await POST(makeRequest({ email: "admin@example.com", password: "password" }));
    expect(res.status).toBe(200);
    expect(setSessionCookie).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin" }),
    );
  });
});
