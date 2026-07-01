import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/staff-db", () => ({
  listStaff: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import { listStaff } from "@/lib/staff-db";
import { GET } from "../route";

const ADMIN_SESSION: SessionData = {
  userId: "user-admin-1",
  nurseryId: "nursery-hoshinoko",
  role: "admin",
  email: "admin@example.com",
};

const MANAGER_SESSION: SessionData = {
  userId: "user-manager-1",
  nurseryId: "nursery-hoshinoko",
  role: "manager",
  email: "manager@example.com",
};

const STAFF_SESSION: SessionData = {
  userId: "user-staff-1",
  nurseryId: "nursery-hoshinoko",
  role: "staff",
  email: "staff@example.com",
};

const MOCK_STAFF = [{ id: "s1", name: "田中花子", employment_type: "full_time", is_active: true }];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/staff", () => {
  it("admin はスタッフ一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(listStaff).mockResolvedValue(MOCK_STAFF as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_STAFF);
  });

  it("manager はスタッフ一覧を取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);
    vi.mocked(listStaff).mockResolvedValue(MOCK_STAFF as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_STAFF);
  });

  it("staff は id と display_name のみ取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(STAFF_SESSION);
    vi.mocked(listStaff).mockResolvedValue(MOCK_STAFF as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ id: "s1", name: "田中花子" }]);
    expect(body.data[0]).not.toHaveProperty("employment_type");
    expect(body.data[0]).not.toHaveProperty("is_active");
  });

  it("未認証は 401 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });
});
