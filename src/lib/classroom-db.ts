import type { Classroom as PrismaClassroom, ClassroomStaff } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
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

type ClassroomWithStaffs = PrismaClassroom & {
  classroom_staffs: Pick<ClassroomStaff, "staff_id" | "role">[];
};

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

export function toClassroom(record: ClassroomWithStaffs): Classroom {
  const mainStaff = record.classroom_staffs.find((cs) => cs.role === "main");
  const otherStaffs = record.classroom_staffs
    .filter((cs) => cs.role === "sub")
    .map((cs) => cs.staff_id);

  return {
    id: record.id,
    name: record.name,
    ageGroup: record.age_group as AgeGroup,
    childCount: record.child_count,
    auxiliarySlots: parseAuxiliarySlots(record.auxiliary_slots ?? []),
    mainStaffId: mainStaff?.staff_id ?? null,
    otherStaffIds: otherStaffs,
    note: record.note ?? "",
  };
}

const CLASSROOM_STAFF_INCLUDE = {
  classroom_staffs: {
    select: { staff_id: true, role: true },
  },
} as const;

async function resolveStaffAssignment(
  nurseryId: string,
  mainStaffId: string | null,
  otherStaffIds: string[],
) {
  const deduped = [...new Set(otherStaffIds)];
  const requestedIds = [
    ...(mainStaffId ? [mainStaffId] : []),
    ...deduped,
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

  const validMain = mainStaffId ?? null;
  const validOthers = deduped.filter((id) => id !== validMain);

  return { mainStaffId: validMain, otherStaffIds: validOthers };
}

function buildClassroomStaffEntries(
  classroomId: string,
  mainStaffId: string | null,
  otherStaffIds: string[],
) {
  const entries: { classroom_id: string; staff_id: string; role: "main" | "sub" }[] = [];

  if (mainStaffId) {
    entries.push({ classroom_id: classroomId, staff_id: mainStaffId, role: "main" });
  }

  for (const staffId of otherStaffIds) {
    entries.push({ classroom_id: classroomId, staff_id: staffId, role: "sub" });
  }

  return entries;
}

export async function listClassrooms(nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const rows = await prisma.classroom.findMany({
    where: { nursery_id: resolvedNurseryId },
    orderBy: [{ age_group: "asc" }, { name: "asc" }],
    include: CLASSROOM_STAFF_INCLUDE,
  });

  return rows.map(toClassroom);
}

export async function getClassroomById(id: string) {
  const row = await prisma.classroom.findUnique({
    where: { id },
    include: CLASSROOM_STAFF_INCLUDE,
  });
  return row ? toClassroom(row) : null;
}

export async function createClassroom(input: ClassroomWriteInput, nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const { mainStaffId, otherStaffIds } = await resolveStaffAssignment(
    resolvedNurseryId,
    input.mainStaffId,
    input.otherStaffIds,
  );

  const staffCreateData = [
    ...(mainStaffId ? [{ staff_id: mainStaffId, role: "main" as const }] : []),
    ...otherStaffIds.map((id) => ({ staff_id: id, role: "sub" as const })),
  ];

  const row = await prisma.classroom.create({
    data: {
      nursery_id: resolvedNurseryId,
      name: input.name,
      age_group: input.ageGroup,
      child_count: input.childCount,
      auxiliary_slots: input.auxiliarySlots as Prisma.InputJsonValue,
      note: input.note || null,
      ...(staffCreateData.length > 0
        ? { classroom_staffs: { createMany: { data: staffCreateData } } }
        : {}),
    },
    include: CLASSROOM_STAFF_INCLUDE,
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

  const { mainStaffId, otherStaffIds } = await resolveStaffAssignment(
    existing.nursery_id,
    input.mainStaffId,
    input.otherStaffIds,
  );

  const row = await prisma.$transaction(async (tx) => {
    await tx.classroom.update({
      where: { id },
      data: {
        name: input.name,
        age_group: input.ageGroup,
        child_count: input.childCount,
        auxiliary_slots: input.auxiliarySlots as Prisma.InputJsonValue,
        note: input.note || null,
      },
    });

    await tx.classroomStaff.deleteMany({ where: { classroom_id: id } });

    const entries = buildClassroomStaffEntries(id, mainStaffId, otherStaffIds);
    if (entries.length > 0) {
      await tx.classroomStaff.createMany({ data: entries });
    }

    return tx.classroom.findUniqueOrThrow({
      where: { id },
      include: CLASSROOM_STAFF_INCLUDE,
    });
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

export function isForeignKeyConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  );
}
