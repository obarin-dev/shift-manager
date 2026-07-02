import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/classroom-db", () => ({
  getClassroomById: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  InvalidStaffAssignmentError: class InvalidStaffAssignmentError extends Error {
    invalidStaffIds: string[];
    constructor(ids: string[]) {
      super("invalid_staff_assignment");
      this.invalidStaffIds = ids;
    }
  },
  isForeignKeyConstraintError: vi.fn(),
  isUniqueConstraintError: vi.fn(),
}));

import { getSession } from "@/lib/auth-session";
import {
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  InvalidStaffAssignmentError,
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from "@/lib/classroom-db";
import { GET, PATCH, DELETE } from "../route";

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

const MOCK_CLASSROOM = {
  id: "c1",
  name: "ひよこ組",
  ageGroup: "age_0",
  childCount: 8,
  auxiliarySlots: [],
  mainStaffId: null,
  otherStaffIds: [],
  note: "",
};

const VALID_BODY = {
  name: "ひよこ組",
  ageGroup: "age_0",
  childCount: 8,
  auxiliarySlots: [],
  mainStaffId: null,
  otherStaffIds: [],
  note: "",
};

function makeContext(id = "c1") {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown) {
  return new Request(`http://localhost/api/classrooms/c1`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isForeignKeyConstraintError).mockReturnValue(false);
  vi.mocked(isUniqueConstraintError).mockReturnValue(false);
});

// ────────────────────────────────────────────────────────────
// GET /api/classrooms/[id]
// ────────────────────────────────────────────────────────────
describe("GET /api/classrooms/[id]", () => {
  it("admin はクラスを取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);

    const res = await GET(makeRequest("GET"), makeContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_CLASSROOM);
  });

  it("存在しないクラスは 404 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(null);

    const res = await GET(makeRequest("GET"), makeContext("unknown"));
    expect(res.status).toBe(404);
  });

  it("未認証は 401 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET(makeRequest("GET"), makeContext());
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────
// PATCH /api/classrooms/[id]
// ────────────────────────────────────────────────────────────
describe("PATCH /api/classrooms/[id]", () => {
  it("admin はクラスを更新できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);
    vi.mocked(updateClassroom).mockResolvedValue(MOCK_CLASSROOM as never);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MOCK_CLASSROOM);
  });

  it("manager は 403 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    expect(res.status).toBe(403);
  });

  it("未認証は 401 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    expect(res.status).toBe(401);
  });

  it("不正なペイロードは 400 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);

    const res = await PATCH(makeRequest("PATCH", { name: "" }), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_payload");
  });

  it("存在しないクラスは 404 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext("unknown"));
    expect(res.status).toBe(404);
  });

  it("InvalidStaffAssignmentError は 400 invalid_staff が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);
    vi.mocked(updateClassroom).mockRejectedValue(
      new InvalidStaffAssignmentError(["staff-x"]),
    );

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_staff");
  });

  it("FK 制約違反 (P2003) は 400 invalid_staff が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);
    const fkError = new Prisma.PrismaClientKnownRequestError("fk error", {
      code: "P2003",
      clientVersion: "0",
    });
    vi.mocked(updateClassroom).mockRejectedValue(fkError);
    vi.mocked(isForeignKeyConstraintError).mockReturnValue(true);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_staff");
  });

  it("クラス名重複は 409 duplicate_name が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);
    vi.mocked(updateClassroom).mockRejectedValue(new Error("duplicate"));
    vi.mocked(isUniqueConstraintError).mockReturnValue(true);

    const res = await PATCH(makeRequest("PATCH", VALID_BODY), makeContext());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("duplicate_name");
  });
});

// ────────────────────────────────────────────────────────────
// DELETE /api/classrooms/[id]
// ────────────────────────────────────────────────────────────
describe("DELETE /api/classrooms/[id]", () => {
  it("admin はクラスを削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(MOCK_CLASSROOM as never);
    vi.mocked(deleteClassroom).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("manager は 403 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(403);
  });

  it("未認証は 401 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await DELETE(makeRequest("DELETE"), makeContext());
    expect(res.status).toBe(401);
  });

  it("存在しないクラスは 404 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getClassroomById).mockResolvedValue(null);

    const res = await DELETE(makeRequest("DELETE"), makeContext("unknown"));
    expect(res.status).toBe(404);
  });
});
