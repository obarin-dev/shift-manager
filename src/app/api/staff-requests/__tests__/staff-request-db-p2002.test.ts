import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    staffRequest: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/nursery-time", () => ({
  parseDateToDb: vi.fn((s: string) => new Date(s)),
  formatDbDate: vi.fn((d: Date) => d.toISOString().slice(0, 10)),
  getTodayJst: vi.fn(() => "2026-06-01"),
}));

import { prisma } from "@/lib/prisma";
import { createStaffRequest, updateStaffRequest } from "@/lib/staff-request-db";

const OWNER = { nurseryId: "nursery-hoshinoko", userId: "user-1", staffId: "staff-1" };
const INPUT = { date: "2026-07-10", type: "休み希望" as const, time: "終日" };

function makeP2002(target: string[]) {
  const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
    meta: { target },
  });
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createStaffRequest — P2002 判定", () => {
  it("(user_id, request_date) 違反は 'duplicate' を返す", async () => {
    vi.mocked(prisma.staffRequest.create).mockRejectedValue(
      makeP2002(["user_id", "request_date"]),
    );
    const result = await createStaffRequest(OWNER, INPUT);
    expect(result).toBe("duplicate");
  });

  it("別フィールドの P2002 は throw する", async () => {
    vi.mocked(prisma.staffRequest.create).mockRejectedValue(
      makeP2002(["nursery_id", "some_other_field"]),
    );
    await expect(createStaffRequest(OWNER, INPUT)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it("meta.target が配列でない P2002 は throw する", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
      meta: { target: "StaffRequest_user_id_request_date_key" },
    });
    vi.mocked(prisma.staffRequest.create).mockRejectedValue(err);
    await expect(createStaffRequest(OWNER, INPUT)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });
});

describe("updateStaffRequest — P2002 判定", () => {
  beforeEach(() => {
    vi.mocked(prisma.staffRequest.findFirst).mockResolvedValue({
      id: "req-1",
      nursery_id: "nursery-hoshinoko",
      user_id: "user-1",
      staff_id: "staff-1",
      request_date: new Date("2026-07-10"),
      request_type: "day_off",
      time_preference: "終日",
      memo: null,
      status: "submitted",
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  it("(user_id, request_date) 違反は 'duplicate' を返す", async () => {
    vi.mocked(prisma.staffRequest.update).mockRejectedValue(
      makeP2002(["user_id", "request_date"]),
    );
    const result = await updateStaffRequest(OWNER, "req-1", INPUT);
    expect(result).toBe("duplicate");
  });

  it("別フィールドの P2002 は throw する", async () => {
    vi.mocked(prisma.staffRequest.update).mockRejectedValue(
      makeP2002(["nursery_id", "some_other_field"]),
    );
    await expect(updateStaffRequest(OWNER, "req-1", INPUT)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });
});
