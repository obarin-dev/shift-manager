import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/user-db";

export type SetupInput = {
  nurseryName: string;
  address: string;
  phoneNumber: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export async function isSetupRequired(): Promise<boolean> {
  const count = await prisma.nursery.count();
  return count === 0;
}

export async function createInitialSetup(input: SetupInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const count = await tx.nursery.count();
    if (count > 0) throw new SetupAlreadyDoneError();

    const passwordHash = await hashPassword(input.adminPassword);

    const nursery = await tx.nursery.create({
      data: {
        name: input.nurseryName.trim(),
        address: input.address.trim() || null,
        phone_number: input.phoneNumber.trim() || null,
      },
    });

    await tx.staff.create({
      data: {
        nursery_id: nursery.id,
        name: input.adminName.trim(),
        email: input.adminEmail.trim().toLowerCase(),
        password_hash: passwordHash,
        role: "admin",
        is_active: true,
        capable_class_ids: [],
        staff_login_id: "000001",
      },
    });
  });
}

export class SetupAlreadyDoneError extends Error {
  constructor() {
    super("Setup has already been completed");
    this.name = "SetupAlreadyDoneError";
  }
}
