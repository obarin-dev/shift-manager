import type { Classroom as PrismaClassroom } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_NURSERY_ID, getPrimaryNursery } from "@/lib/nursery-db";
import type { AgeGroup, AuxiliaryStaffSlot, Classroom } from "@/lib/classroom-helpers";

export type ClassroomWriteInput = {
  name: string;
  ageGroup: AgeGroup;
  childCount: number;
  auxiliarySlots: AuxiliaryStaffSlot[];
  mainStaffId: string | null;
  otherStaffIds: string[];
  note: string;
};

export class InvalidStaffAssignmentError extends Error {
  readonly invalidStaffIds: string[];

  constructor(invalidStaffIds: string[]) {
    super("invalid_staff_assignment");
    this.name = "InvalidStaffAssignmentError";
    this.invalidStaffIds = invalidStaffIds;
  }
}

function parseAuxiliarySlots(value: Prisma.JsonValue): AuxiliaryStaffSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const slot = item as Record<string, unknown>;
    const id = typeof slot.id === "string" ? slot.id : "";
    const count = typeof slot.count === "number" ? slot.count : Number(slot.count);
    const time = typeof slot.time === "string" ? slot.time : "";

    if (!id || Number.isNaN(count)) {
      return [];
    }

    return [{ id, count, time }];
  });
}

export function toClassroom(record: PrismaClassroom): Classroom {
  return {
    id: record.id,
    name: record.name,
    ageGroup: record.age_group as AgeGroup,
    childCount: record.child_count,
    auxiliarySlots: parseAuxiliarySlots(record.auxiliary_slots ?? []),
    mainStaffId: record.main_staff_id,
    otherStaffIds: record.other_staff_ids ?? [],
    note: record.note ?? "",
  };
}

async function resolveNurseryId(nurseryId?: string) {
  if (nurseryId) {
    return nurseryId;
  }

  const nursery = await getPrimaryNursery();
  return nursery?.id ?? DEFAULT_NURSERY_ID;
}

async function resolveStaffAssignment(
  nurseryId: string,
  mainStaffId: string | null,
  otherStaffIds: string[],
) {
  const requestedIds = [
    ...(mainStaffId ? [mainStaffId] : []),
    ...otherStaffIds,
  ];

  if (requestedIds.length === 0) {
    return { mainStaffId: null, otherStaffIds: [] as string[] };
  }

  const existing = await prisma.staff.findMany({
    where: { nursery_id: nurseryId, id: { in: requestedIds } },
    select: { id: true },
  });
  const validIds = new Set(existing.map((staff) => staff.id));
  const invalidStaffIds = requestedIds.filter((id) => !validIds.has(id));

  if (invalidStaffIds.length > 0) {
    throw new InvalidStaffAssignmentError(invalidStaffIds);
  }

  const validMain = mainStaffId && validIds.has(mainStaffId) ? mainStaffId : null;
  const validOthers = otherStaffIds.filter(
    (id) => validIds.has(id) && id !== validMain,
  );

  return { mainStaffId: validMain, otherStaffIds: validOthers };
}

function buildClassroomData(
  input: ClassroomWriteInput,
  staff: { mainStaffId: string | null; otherStaffIds: string[] },
) {
  return {
    name: input.name,
    age_group: input.ageGroup,
    child_count: input.childCount,
    auxiliary_slots: input.auxiliarySlots as Prisma.InputJsonValue,
    main_staff_id: staff.mainStaffId,
    other_staff_ids: staff.otherStaffIds,
    note: input.note || null,
  };
}

export async function listClassrooms(nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const rows = await prisma.classroom.findMany({
    where: { nursery_id: resolvedNurseryId },
    orderBy: [{ age_group: "asc" }, { name: "asc" }],
  });

  return rows.map(toClassroom);
}

export async function getClassroomById(id: string) {
  const row = await prisma.classroom.findUnique({ where: { id } });
  return row ? toClassroom(row) : null;
}

export async function createClassroom(input: ClassroomWriteInput, nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const staff = await resolveStaffAssignment(
    resolvedNurseryId,
    input.mainStaffId,
    input.otherStaffIds,
  );

  const row = await prisma.classroom.create({
    data: {
      nursery_id: resolvedNurseryId,
      ...buildClassroomData(input, staff),
    },
  });

  return toClassroom(row);
}

export async function updateClassroom(id: string, input: ClassroomWriteInput) {
  const existing = await prisma.classroom.findUnique({
    where: { id },
    select: { nursery_id: true },
  });

  if (!existing) {
    return null;
  }

  const staff = await resolveStaffAssignment(
    existing.nursery_id,
    input.mainStaffId,
    input.otherStaffIds,
  );

  const row = await prisma.classroom.update({
    where: { id },
    data: buildClassroomData(input, staff),
  });

  return toClassroom(row);
}

export async function deleteClassroom(id: string) {
  await prisma.classroom.delete({ where: { id } });
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
