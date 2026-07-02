import { NextResponse } from "next/server";
import {
  deleteClassroom,
  getClassroomById,
  InvalidStaffAssignmentError,
  isForeignKeyConstraintError,
  isUniqueConstraintError,
  updateClassroom,
  type ClassroomWriteInput,
} from "@/lib/classroom-db";
import type { AgeGroup, AuxiliaryStaffSlot } from "@/lib/classroom-helpers";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

const AGE_GROUPS = new Set<AgeGroup>([
  "age_0",
  "age_1",
  "age_2",
  "age_3",
  "age_4",
  "age_5",
  "mixed",
]);

function parseAuxiliarySlots(value: unknown): AuxiliaryStaffSlot[] | null {
  if (!Array.isArray(value)) {
    return [];
  }

  const slots: AuxiliaryStaffSlot[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const slot = item as Record<string, unknown>;
    const id = typeof slot.id === "string" ? slot.id : "";
    const count = typeof slot.count === "number" ? slot.count : Number(slot.count);
    const time = typeof slot.time === "string" ? slot.time : "";

    if (!id || Number.isNaN(count) || typeof time !== "string") {
      return null;
    }

    slots.push({ id, count, time });
  }

  return slots;
}

function parseWriteBody(body: unknown): ClassroomWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const ageGroup = payload.ageGroup;
  const childCount =
    typeof payload.childCount === "number"
      ? payload.childCount
      : Number(payload.childCount);
  const auxiliarySlots = parseAuxiliarySlots(payload.auxiliarySlots);
  const mainStaffId =
    payload.mainStaffId === null
      ? null
      : typeof payload.mainStaffId === "string"
        ? payload.mainStaffId.trim() || null
        : null;
  const otherStaffIds = Array.isArray(payload.otherStaffIds)
    ? payload.otherStaffIds.filter((id): id is string => typeof id === "string")
    : null;
  const note = typeof payload.note === "string" ? payload.note.trim() : "";

  if (
    !name ||
    typeof ageGroup !== "string" ||
    !AGE_GROUPS.has(ageGroup as AgeGroup) ||
    Number.isNaN(childCount) ||
    auxiliarySlots === null ||
    otherStaffIds === null
  ) {
    return null;
  }

  return {
    name,
    ageGroup: ageGroup as AgeGroup,
    childCount,
    auxiliarySlots,
    mainStaffId,
    otherStaffIds,
    note,
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const { id } = await context.params;

  try {
    const classroom = await getClassroomById(id);

    if (!classroom) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: classroom });
  } catch (error) {
    console.error("[GET /api/classrooms/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  const { id } = await context.params;
  const input = parseWriteBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const existing = await getClassroomById(id);

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const classroom = await updateClassroom(id, input);

    if (!classroom) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: classroom });
  } catch (error) {
    if (error instanceof InvalidStaffAssignmentError) {
      return NextResponse.json({ error: "invalid_staff" }, { status: 400 });
    }

    if (isForeignKeyConstraintError(error)) {
      return NextResponse.json({ error: "invalid_staff" }, { status: 400 });
    }

    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
    }

    console.error("[PATCH /api/classrooms/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  const { id } = await context.params;

  try {
    const existing = await getClassroomById(id);

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await deleteClassroom(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/classrooms/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
