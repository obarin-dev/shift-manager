import type { Staff as PrismaStaff } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import type { StaffMember, StaffShiftTime } from "@/lib/staff-helpers";
import type { EmploymentType, JobType } from "@/lib/staff-helpers";
import { getJobTypeLabel } from "@/lib/staff-helpers";
import { formatDbTime, parseTimeToDate } from "@/lib/nursery-time";

export type StaffWriteInput = {
  staff_id: string;
  last_name: string;
  first_name: string;
  employment_type: EmploymentType;
  job_type: JobType;
  has_nursery_teacher_license: boolean;
  work_availability: StaffShiftTime;
  is_active: boolean;
};

export class DuplicateStaffLoginIdError extends Error {
  constructor() {
    super("duplicate_staff_login_id");
    this.name = "DuplicateStaffLoginIdError";
  }
}

function shiftTimeToDb(time: StaffShiftTime) {
  const start = time.start.trim();
  const end = time.end.trim();

  return {
    work_availability_start: start ? parseTimeToDate(start) : null,
    work_availability_end: end ? parseTimeToDate(end) : null,
  };
}

export function toStaffMember(record: PrismaStaff): StaffMember {
  return {
    id: record.id,
    staff_id: record.staff_login_id ?? "",
    name: record.name,
    last_name: record.last_name ?? record.name.split(/[\s　]/)[0] ?? record.name,
    first_name: record.first_name ?? record.name.split(/[\s　]/).slice(1).join(" ") ?? "",
    role: record.role ?? null,
    roleLabel: getJobTypeLabel(record.job_type as JobType | null),
    capable_class_ids: record.capable_class_ids ?? [],
    employment_type: record.employment_type as EmploymentType | null,
    job_type: record.job_type as JobType | null,
    has_nursery_teacher_license: record.has_nursery_teacher_license,
    work_availability: {
      start: record.work_availability_start
        ? formatDbTime(record.work_availability_start)
        : "",
      end: record.work_availability_end
        ? formatDbTime(record.work_availability_end)
        : "",
    },
    is_active: record.is_active,
    hasAccount: record.email != null,
  };
}


function buildStaffData(input: StaffWriteInput, staffLoginId: string | null) {
  const fullName = [input.last_name, input.first_name].filter(Boolean).join(" ");
  return {
    name: fullName,
    last_name: input.last_name,
    first_name: input.first_name || null,
    employment_type: input.employment_type,
    job_type: input.job_type,
    has_nursery_teacher_license: input.has_nursery_teacher_license,
    staff_login_id: staffLoginId,
    ...shiftTimeToDb(input.work_availability),
    is_active: input.is_active,
  };
}

export async function allocateNextStaffLoginId(nurseryId: string) {
  const rows = await prisma.staff.findMany({
    where: {
      nursery_id: nurseryId,
      staff_login_id: { not: null },
    },
    select: { staff_login_id: true },
  });

  let max = 0;

  for (const row of rows) {
    const loginId = row.staff_login_id?.trim();

    if (loginId && /^\d+$/.test(loginId)) {
      max = Math.max(max, Number(loginId));
    }
  }

  const next = max + 1;

  if (next > 999999) {
    throw new Error("staff_login_id_exhausted");
  }

  return String(next).padStart(6, "0");
}

export async function listStaff(nurseryId?: string, opts?: { schedulableOnly?: boolean }) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const rows = await prisma.staff.findMany({
    where: {
      nursery_id: resolvedNurseryId,
      ...(opts?.schedulableOnly ? { employment_type: { not: null } } : {}),
    },
    orderBy: [{ staff_login_id: "asc" }, { name: "asc" }],
  });

  return rows.map(toStaffMember);
}

export async function getStaffById(id: string) {
  const row = await prisma.staff.findUnique({ where: { id } });
  return row ? toStaffMember(row) : null;
}

export async function createStaff(input: StaffWriteInput, nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const staffLoginId = await allocateNextStaffLoginId(resolvedNurseryId);

  try {
    const row = await prisma.staff.create({
      data: {
        nursery_id: resolvedNurseryId,
        capable_class_ids: [],
        ...buildStaffData(input, staffLoginId),
      },
    });

    return toStaffMember(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateStaffLoginIdError();
    }

    throw error;
  }
}

export async function updateStaff(id: string, input: StaffWriteInput) {
  const existing = await prisma.staff.findUnique({
    where: { id },
    select: { nursery_id: true, staff_login_id: true },
  });

  if (!existing) {
    return null;
  }

  const staffLoginId =
    existing.staff_login_id ??
    (await allocateNextStaffLoginId(existing.nursery_id));

  try {
    const row = await prisma.staff.update({
      where: { id },
      data: buildStaffData(input, staffLoginId),
    });

    return toStaffMember(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateStaffLoginIdError();
    }

    throw error;
  }
}

export async function deleteStaff(id: string) {
  await prisma.staff.delete({ where: { id } });
}
