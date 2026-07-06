import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/staff-db", () => ({
  updateStaff: vi.fn(),
  getStaffById: vi.fn(),
  DuplicateStaffLoginIdError: class DuplicateStaffLoginIdError extends Error {
    constructor() {
      super("duplicate_staff_login_id");
      this.name = "DuplicateStaffLoginIdError";
    }
  },
}));

import { getSession } from "@/lib/auth-session";
import { updateStaff, DuplicateStaffLoginIdError } from "@/lib/staff-db";
import { PATCH } from "../route";

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

const VALID_PAYLOAD = {
  last_name: "山田",
  first_name: "花子",
  employment_type: "seikin",
  job_type: "nursery_teacher",
  has_nursery_teacher_license: true,
  work_availability: { start: "07:00", end: "19:00" },
  is_active: true,
};

const MOCK_STAFF = {
  id: "staff-1",
  name: "山田 花子",
  last_name: "山田",
  first_name: "花子",
  employment_type: "seikin",
  job_type: "nursery_teacher",
  is_active: true,
};

function makeRequest(body: unknown, id = "staff-1") {
  return {
    request: new Request(`http://localhost/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    context: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("PATCH /api/staff/[id]", () => {
  it("admin は有効なペイロードでスタッフを更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateStaff).mockResolvedValue(MOCK_STAFF as never);

    const { request, context } = makeRequest(VALID_PAYLOAD);
    const res = await PATCH(request, context);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_STAFF);
  });

  it("employment_type と job_type が null のペイロードを受け付ける", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateStaff).mockResolvedValue({ ...MOCK_STAFF, employment_type: null, job_type: null } as never);

    const { request, context } = makeRequest({ ...VALID_PAYLOAD, employment_type: null, job_type: null });
    const res = await PATCH(request, context);

    expect(res.status).toBe(200);
    const call = vi.mocked(updateStaff).mock.calls[0];
    expect(call[1].employment_type).toBeNull();
    expect(call[1].job_type).toBeNull();
  });

  it("不正な employment_type は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);

    const { request, context } = makeRequest({ ...VALID_PAYLOAD, employment_type: "invalid_type" });
    const res = await PATCH(request, context);

    expect(res.status).toBe(400);
  });

  it("スタッフが存在しない場合 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateStaff).mockResolvedValue(null);

    const { request, context } = makeRequest(VALID_PAYLOAD);
    const res = await PATCH(request, context);

    expect(res.status).toBe(404);
  });

  it("職員ID重複は 409 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(updateStaff).mockRejectedValue(new DuplicateStaffLoginIdError());

    const { request, context } = makeRequest(VALID_PAYLOAD);
    const res = await PATCH(request, context);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("duplicate_staff_id");
  });

  it("manager は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);

    const { request, context } = makeRequest(VALID_PAYLOAD);
    const res = await PATCH(request, context);

    expect(res.status).toBe(403);
  });

  it("未認証は 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const { request, context } = makeRequest(VALID_PAYLOAD);
    const res = await PATCH(request, context);

    expect(res.status).toBe(401);
  });
});
