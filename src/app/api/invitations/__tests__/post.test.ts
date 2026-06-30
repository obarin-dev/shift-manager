import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { InvitationRecord } from "@/lib/invitation-db";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/invitation-db", () => ({
  listPendingInvitations: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@/lib/nursery-db", () => ({
  getActiveNurseryId: vi.fn().mockResolvedValue("nursery-hoshinoko"),
}));

import { getSession } from "@/lib/auth-session";
import { createInvitation } from "@/lib/invitation-db";
import { POST } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const CREATED_INVITATION: InvitationRecord = {
  id: "inv-new",
  nurseryId: "nursery-hoshinoko",
  staffId: null,
  staffName: null,
  adminNote: "",
  method: "url",
  status: "pending",
  token: "tok-xyz",
  expiresAt: "2099-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
  vi.mocked(createInvitation).mockResolvedValue(CREATED_INVITATION);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/invitations", () => {
  it("正常作成で 201 と招待データを返す", async () => {
    const res = await POST(makeRequest({ method: "url" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("inv-new");
  });

  it("qr method も受け付ける", async () => {
    const res = await POST(makeRequest({ method: "qr" }));
    expect(res.status).toBe(201);
  });

  it("staff_id を渡すと createInvitation に渡る", async () => {
    await POST(makeRequest({ method: "url", staff_id: "staff-1" }));
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ staffId: "staff-1" }),
    );
  });

  it("expiry_hours が正常範囲: createInvitation に渡る", async () => {
    await POST(makeRequest({ method: "url", expiry_hours: 48 }));
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ expiryHours: 48 }),
    );
  });

  it("expiry_hours が範囲外 (721): デフォルト 168 が使われる", async () => {
    await POST(makeRequest({ method: "url", expiry_hours: 721 }));
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ expiryHours: 168 }),
    );
  });

  it("method が不正: 400 を返す", async () => {
    const res = await POST(makeRequest({ method: "email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_method" });
  });

  it("method が欠如: 400 を返す", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_method" });
  });

  it("body が JSON でない: 400 を返す", async () => {
    const req = new Request("http://localhost/api/invitations", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(makeRequest({ method: "url" }));
    expect(res.status).toBe(401);
  });

  it("staff ロール: 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, role: "staff" });
    const res = await POST(makeRequest({ method: "url" }));
    expect(res.status).toBe(403);
  });

  it("存在しない staff_id: P2003 エラーで 400 を返す", async () => {
    const p2003 = new Prisma.PrismaClientKnownRequestError("FK constraint", {
      code: "P2003",
      clientVersion: "7.0.0",
    });
    vi.mocked(createInvitation).mockRejectedValue(p2003);
    const res = await POST(makeRequest({ method: "url", staff_id: "ghost" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "staff_not_found" });
  });

  it("DB エラー: 500 を返す", async () => {
    vi.mocked(createInvitation).mockRejectedValue(new Error("db error"));
    const res = await POST(makeRequest({ method: "url" }));
    expect(res.status).toBe(500);
  });
});
