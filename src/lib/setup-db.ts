import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/user-db";
import { INITIAL_SHIFT_TYPES } from "@/lib/nursery-helpers";
import { parseTimeToDate } from "@/lib/nursery-time";
import { normalizeShiftColor, getDefaultColorForShiftCode, DEFAULT_SHIFT_TYPE_COLOR } from "@/lib/shift-type-colors";

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

    for (const shiftType of INITIAL_SHIFT_TYPES) {
      const color =
        normalizeShiftColor(shiftType.color) ??
        getDefaultColorForShiftCode(shiftType.code) ??
        DEFAULT_SHIFT_TYPE_COLOR;
      await tx.shiftType.create({
        data: {
          nursery_id: nursery.id,
          code: shiftType.code,
          name: shiftType.name,
          start_time: parseTimeToDate(shiftType.start),
          end_time: parseTimeToDate(shiftType.end),
          is_active: shiftType.is_active,
          sort_order: shiftType.sort_order,
          color,
        },
      });
    }
  });
}

export class SetupAlreadyDoneError extends Error {
  constructor() {
    super("Setup has already been completed");
    this.name = "SetupAlreadyDoneError";
  }
}
