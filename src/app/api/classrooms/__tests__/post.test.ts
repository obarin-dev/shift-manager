import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "@/lib/auth-session";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/classroom-db", () => ({
  createClassroom: vi.fn(),
  listClassrooms: vi.fn(),
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
  createClassroom,
  InvalidStaffAssignmentError,
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from "@/lib/classroom-db";
import { POST } from "../route";

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

const VALID_BODY = {
  name: "ひよこ組",
  ageGroup: "age_0",
  childCount: 8,
  auxiliarySlots: [],
  mainStaffId: null,
  otherStaffIds: [],
  note: "",
};

const MOCK_CLASSROOM = { id: "c1", name: "ひよこ組", ageGroup: "age_0", childCount: 8, auxiliarySlots: [], mainStaffId: null, otherStaffIds: [], note: "" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/classrooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isForeignKeyConstraintError).mockReturnValue(false);
  vi.mocked(isUniqueConstraintError).mockReturnValue(false);
});

describe("POST /api/classrooms", () => {
  it("admin はクラスを作成できる", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createClassroom).mockResolvedValue(MOCK_CLASSROOM as never);

    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(MOCK_CLASSROOM);
  });

  it("manager は 403 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(MANAGER_SESSION);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("未認証は 401 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("不正なペイロードは 400 が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);

    const res = await POST(makeRequest({ name: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_payload");
  });

  it("InvalidStaffAssignmentError は 400 invalid_staff が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createClassroom).mockRejectedValue(
      new InvalidStaffAssignmentError(["staff-x"]),
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_staff");
  });

  it("FK 制約違反 (P2003) は 400 invalid_staff が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    const fkError = new Prisma.PrismaClientKnownRequestError("fk error", {
      code: "P2003",
      clientVersion: "0",
    });
    vi.mocked(createClassroom).mockRejectedValue(fkError);
    vi.mocked(isForeignKeyConstraintError).mockReturnValue(true);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_staff");
  });

  it("クラス名重複は 409 duplicate_name が返る", async () => {
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createClassroom).mockRejectedValue(new Error("duplicate"));
    vi.mocked(isUniqueConstraintError).mockReturnValue(true);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("duplicate_name");
  });
});
