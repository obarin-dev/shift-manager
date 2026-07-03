import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/user-db";
import { parseTimeToDate } from "@/lib/nursery-time";

export type SetupInput = {
  nurseryName: string;
  address: string;
  phoneNumber: string;
  openTime: string;
  closeTime: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export async function isSetupRequired(): Promise<boolean> {
  const count = await prisma.nursery.count();
  return count === 0;
}

export async function createInitialSetup(input: SetupInput): Promise<void> {
  const required = await isSetupRequired();
  if (!required) {
    throw new SetupAlreadyDoneError();
  }

  const passwordHash = await hashPassword(input.adminPassword);

  await prisma.$transaction(async (tx) => {
    const nursery = await tx.nursery.create({
      data: {
        name: input.nurseryName.trim(),
        address: input.address.trim() || null,
        phone_number: input.phoneNumber.trim() || null,
        open_time: parseTimeToDate(input.openTime),
        close_time: parseTimeToDate(input.closeTime),
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
