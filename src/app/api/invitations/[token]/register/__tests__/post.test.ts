import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InvitationRecord } from "@/lib/invitation-db";

vi.mock("@/lib/invitation-db", () => ({
  getInvitationByToken: vi.fn(),
  InvitationInvalidError: class InvitationInvalidError extends Error {},
  registerWithInvitation: vi.fn(),
}));

vi.mock("@/lib/user-db", () => ({
  findActiveUserByEmail: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  setSessionCookie: vi.fn(),
  AuthConfigError: class AuthConfigError extends Error {},
}));

import { getInvitationByToken, registerWithInvitation } from "@/lib/invitation-db";
import { findActiveUserByEmail, hashPassword } from "@/lib/user-db";
import { setSessionCookie } from "@/lib/auth-session";
import { POST } from "../route";

const PENDING_INVITATION: InvitationRecord = {
  id: "inv-1",
  nurseryId: "nursery-hoshinoko",
  staffId: null,
  staffName: null,
  adminNote: "",
  method: "url",
  status: "pending",
  token: "abc123",
  expiresAt: "2099-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const REGISTERED_USER = {
  userId: "user-1",
  nurseryId: "nursery-hoshinoko",
  email: "new@example.com",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/invitations/abc123/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getInvitationByToken).mockResolvedValue(PENDING_INVITATION);
  vi.mocked(findActiveUserByEmail).mockResolvedValue(null);
  vi.mocked(hashPassword).mockResolvedValue("hashed-password");
  vi.mocked(registerWithInvitation).mockResolvedValue(REGISTERED_USER);
  vi.mocked(setSessionCookie).mockResolvedValue(undefined);
});

describe("POST /api/invitations/[token]/register", () => {
  it("正常登録で 200 を返す", async () => {
    const res = await POST(makeRequest({ email: "new@example.com", password: "password123" }), {
      params: Promise.resolve({ token: "abc123" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, autoLogin: true });
  });

  it("findActiveUserByEmail と hashPassword が並列実行される", async () => {
    const order: string[] = [];
    vi.mocked(findActiveUserByEmail).mockImplementation(async () => {
      order.push("email-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("email-end");
      return null;
    });
    vi.mocked(hashPassword).mockImplementation(async () => {
      order.push("hash-start");
      await new Promise((r) => setTimeout(r, 5));
      order.push("hash-end");
      return "hashed";
    });

    await POST(makeRequest({ email: "new@example.com", password: "password123" }), {
      params: Promise.resolve({ token: "abc123" }),
    });

    // 並列実行なら両方の start が end より先に来る
    expect(order[0]).toBe("email-start");
    expect(order[1]).toBe("hash-start");
  });

  it("メール重複で 409 を返す", async () => {
    vi.mocked(findActiveUserByEmail).mockResolvedValue({
      id: "existing",
      email: "new@example.com",
      passwordHash: "x",
      nurseryId: "nursery-hoshinoko",
      isActive: true,
    } as never);
    const res = await POST(makeRequest({ email: "new@example.com", password: "password123" }), {
      params: Promise.resolve({ token: "abc123" }),
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "email_already_used" });
  });

  it("パスワードが短い場合は 400 を返す", async () => {
    const res = await POST(makeRequest({ email: "new@example.com", password: "short" }), {
      params: Promise.resolve({ token: "abc123" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "password_too_short" });
  });

  it("招待が pending でない場合は 400 を返す", async () => {
    vi.mocked(getInvitationByToken).mockResolvedValue({ ...PENDING_INVITATION, status: "used" });
    const res = await POST(makeRequest({ email: "new@example.com", password: "password123" }), {
      params: Promise.resolve({ token: "abc123" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invitation_invalid" });
  });

  it("email/password が欠けている場合は 400 を返す", async () => {
    const res = await POST(makeRequest({ email: "", password: "" }), {
      params: Promise.resolve({ token: "abc123" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing_fields" });
  });
});
