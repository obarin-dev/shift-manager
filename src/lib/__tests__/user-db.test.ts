import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("bcryptjs", () => ({ default: {} }));

import { createUserInTx } from "@/lib/user-db";

const mockCreate = vi.fn();
const mockTx = { user: { create: mockCreate } } as never;

describe("createUserInTx", () => {
  it("camelCase 引数を snake_case DB フィールドに正しくマッピングして user.create を呼ぶ", async () => {
    mockCreate.mockResolvedValue({ id: "user-1", nursery_id: "n-1", email: "a@b.com" });

    const result = await createUserInTx(mockTx, {
      nurseryId: "n-1",
      staffId: "s-1",
      email: "a@b.com",
      passwordHash: "hashed",
      role: "staff",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        nursery_id: "n-1",
        staff_id: "s-1",
        email: "a@b.com",
        password_hash: "hashed",
        role: "staff",
        is_active: true,
      },
      select: { id: true, nursery_id: true, email: true },
    });
    expect(result).toEqual({ id: "user-1", nursery_id: "n-1", email: "a@b.com" });
  });

  it("staffId が null のとき staff_id: null を渡す", async () => {
    mockCreate.mockResolvedValue({ id: "user-2", nursery_id: "n-1", email: "b@c.com" });

    await createUserInTx(mockTx, {
      nurseryId: "n-1",
      staffId: null,
      email: "b@c.com",
      passwordHash: "hashed",
      role: "staff",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ staff_id: null }) })
    );
  });

  it("is_active は常に true になる", async () => {
    mockCreate.mockResolvedValue({ id: "user-3", nursery_id: "n-1", email: "c@d.com" });

    await createUserInTx(mockTx, {
      nurseryId: "n-1",
      staffId: null,
      email: "c@d.com",
      passwordHash: "hashed",
      role: "staff",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_active: true }) })
    );
  });
});
