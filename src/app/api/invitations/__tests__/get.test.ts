import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import type { InvitationRecord } from "@/lib/invitation-db";

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
import { listPendingInvitations } from "@/lib/invitation-db";
import { GET } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const SAMPLE_INVITATIONS: InvitationRecord[] = [
  {
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
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
  vi.mocked(listPendingInvitations).mockResolvedValue(SAMPLE_INVITATIONS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/invitations", () => {
  it("admin: 200 と招待一覧を返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("inv-1");
  });

  it("manager ロール: 200 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, role: "manager" });
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("未認証: 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("staff ロール: 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, role: "staff" });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("DB エラー: 500 を返す", async () => {
    vi.mocked(listPendingInvitations).mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
