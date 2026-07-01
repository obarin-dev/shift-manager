import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("bcryptjs", () => ({ default: {} }));

import { createUserInTx } from "@/lib/user-db";

const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockTx = {
  staff: { update: mockUpdate, create: mockCreate },
} as never;

describe("createUserInTx", () => {
  it("staffId が指定されているとき Staff を UPDATE してログイン情報を設定する", async () => {
    mockUpdate.mockResolvedValue({ id: "staff-1", nursery_id: "n-1", email: "a@b.com" });

    const result = await createUserInTx(mockTx, {
      nurseryId: "n-1",
      staffId: "staff-1",
      email: "a@b.com",
      passwordHash: "hashed",
      role: "staff",
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: {
        email: "a@b.com",
        password_hash: "hashed",
        role: "staff",
      },
      select: { id: true, nursery_id: true, email: true },
    });
    expect(result).toEqual({ id: "staff-1", nursery_id: "n-1", email: "a@b.com" });
  });

  it("staffId が null のとき 新規 Staff を CREATE する", async () => {
    mockCreate.mockResolvedValue({ id: "new-staff", nursery_id: "n-1", email: "b@c.com" });

    await createUserInTx(mockTx, {
      nurseryId: "n-1",
      staffId: null,
      email: "b@c.com",
      passwordHash: "hashed",
      role: "staff",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nursery_id: "n-1",
          email: "b@c.com",
          password_hash: "hashed",
          role: "staff",
          is_active: true,
        }),
      })
    );
  });
});
