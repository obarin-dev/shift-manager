import { NextResponse } from "next/server";
import {
  deleteStaff,
  DuplicateStaffLoginIdError,
  getStaffById,
  updateStaff,
  type StaffWriteInput,
} from "@/lib/staff-db";
import type { EmploymentType, JobType, StaffShiftTime } from "@/lib/mock-staff";
export const runtime = "nodejs";

const EMPLOYMENT_TYPES = new Set<EmploymentType>(["seikin", "jokin", "hijokin"]);
const JOB_TYPES = new Set<JobType>([
  "nursery_teacher",
  "nurse",
  "cook",
  "office",
  "other",
]);

function parseWorkAvailability(value: unknown): StaffShiftTime | null {
  if (!value || typeof value !== "object") {
    return { start: "", end: "" };
  }

  const time = value as Record<string, unknown>;
  const start = typeof time.start === "string" ? time.start : "";
  const end = typeof time.end === "string" ? time.end : "";

  return { start, end };
}

function parseWriteBody(body: unknown): StaffWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const employmentType = payload.employment_type;
  const jobType = payload.job_type;
  const workAvailability = parseWorkAvailability(payload.work_availability);

  if (
    !name ||
    typeof employmentType !== "string" ||
    !EMPLOYMENT_TYPES.has(employmentType as EmploymentType) ||
    typeof jobType !== "string" ||
    !JOB_TYPES.has(jobType as JobType) ||
    workAvailability === null ||
    typeof payload.has_nursery_teacher_license !== "boolean" ||
    typeof payload.is_active !== "boolean"
  ) {
    return null;
  }

  return {
    staff_id: "",
    name,
    employment_type: employmentType as EmploymentType,
    job_type: jobType as JobType,
    has_nursery_teacher_license: payload.has_nursery_teacher_license,
    work_availability: workAvailability,
    is_active: payload.is_active,
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const staff = await getStaffById(id);

    if (!staff) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error("[GET /api/staff/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const input = parseWriteBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const staff = await updateStaff(id, input);

    if (!staff) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: staff });
  } catch (error) {
    if (error instanceof DuplicateStaffLoginIdError) {
      return NextResponse.json({ error: "duplicate_staff_id" }, { status: 409 });
    }

    console.error("[PATCH /api/staff/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const existing = await getStaffById(id);

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await deleteStaff(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/staff/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
