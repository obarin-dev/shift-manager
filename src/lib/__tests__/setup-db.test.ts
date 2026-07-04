import { describe, it, expect, vi, beforeEach } from "vitest";
import { INITIAL_SHIFT_TYPES } from "@/lib/nursery-helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/user-db", () => ({ hashPassword: vi.fn() }));
vi.mock("@/lib/nursery-time", () => ({
  parseTimeToDate: (time: string) => new Date(`1970-01-01T${time}:00Z`),
}));

import { hashPassword } from "@/lib/user-db";
import { createInitialSetup, SetupAlreadyDoneError } from "@/lib/setup-db";

const mockHashPassword = vi.mocked(hashPassword);

const VALID_INPUT = {
  nurseryName: "星の子保育園",
  address: "東京都",
  phoneNumber: "03-1234-5678",
  adminName: "管理者",
  adminEmail: "admin@example.com",
  adminPassword: "password123",
};

function makeTx(nurseryCount = 0) {
  const nurseryCreate = vi.fn().mockResolvedValue({ id: "nursery-1" });
  const staffCreate = vi.fn().mockResolvedValue({});
  const shiftTypeCreate = vi.fn().mockResolvedValue({});
  const nurseryCountFn = vi.fn().mockResolvedValue(nurseryCount);

  const tx = {
    nursery: { count: nurseryCountFn, create: nurseryCreate },
    staff: { create: staffCreate },
    shiftType: { create: shiftTypeCreate },
  };
  return { tx, nurseryCreate, staffCreate, shiftTypeCreate };
}

describe("createInitialSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHashPassword.mockResolvedValue("hashed_password");
  });

  it("nursery・admin・デフォルトシフト区分を作成する", async () => {
    const { tx, nurseryCreate, staffCreate, shiftTypeCreate } = makeTx(0);

    // prisma.$transaction を直接呼び出せるようにモック
    const { prisma } = await import("@/lib/prisma");
    (prisma as { $transaction: unknown }).$transaction = vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => fn(tx),
    );

    await createInitialSetup(VALID_INPUT);

    expect(nurseryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "星の子保育園" }),
      }),
    );

    expect(staffCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nursery_id: "nursery-1",
          role: "admin",
          email: "admin@example.com",
        }),
      }),
    );

    expect(shiftTypeCreate).toHaveBeenCalledTimes(INITIAL_SHIFT_TYPES.length);
    for (const shiftType of INITIAL_SHIFT_TYPES) {
      expect(shiftTypeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nursery_id: "nursery-1",
            code: shiftType.code,
            name: shiftType.name,
            is_active: shiftType.is_active,
            sort_order: shiftType.sort_order,
          }),
        }),
      );
    }
  });

  it("nursery が既に存在する場合 SetupAlreadyDoneError を投げる", async () => {
    const { tx } = makeTx(1);

    const { prisma } = await import("@/lib/prisma");
    (prisma as { $transaction: unknown }).$transaction = vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => fn(tx),
    );

    await expect(createInitialSetup(VALID_INPUT)).rejects.toBeInstanceOf(SetupAlreadyDoneError);
  });
});
