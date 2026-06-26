import { NextResponse } from "next/server";
import type { ShiftAssignment, ShiftScheduleStatus } from "@/lib/shift-helpers";
import {
  getPublishedShiftScheduleByMonth,
  getShiftScheduleByMonth,
  saveShiftSchedule,
} from "@/lib/shift-schedule-db";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

type PersistedShiftSchedulePayload = {
  status: ShiftScheduleStatus;
  assignments: ShiftAssignment[];
};

function isValidMonthKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function normalizePayload(input: unknown): PersistedShiftSchedulePayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const body = input as Partial<PersistedShiftSchedulePayload>;
  if (!Array.isArray(body.assignments)) {
    return null;
  }

  const status = body.status;
  if (
    status &&
    status !== "draft" &&
    status !== "checking" &&
    status !== "confirmed" &&
    status !== "published"
  ) {
    return null;
  }

  const assignments: ShiftAssignment[] = [];
  for (const item of body.assignments) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const assignment = item as Partial<ShiftAssignment>;
    if (
      typeof assignment.staff_id !== "string" ||
      typeof assignment.work_date !== "string" ||
      typeof assignment.shift_type !== "string"
    ) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(assignment.work_date)) {
      return null;
    }

    assignments.push({
      staff_id: assignment.staff_id,
      work_date: assignment.work_date,
      shift_type: assignment.shift_type,
    });
  }

  return {
    status: status ?? "draft",
    assignments,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  if (!isValidMonthKey(month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  const isPublished = params.get("published") === "true";

  if (!isPublished && session.role === "staff") {
    return forbiddenResponse();
  }

  try {
    const data = isPublished
      ? await getPublishedShiftScheduleByMonth(month!)
      : await getShiftScheduleByMonth(month!);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/shift-schedules failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  const month = new URL(request.url).searchParams.get("month");
  if (!isValidMonthKey(month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload = normalizePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (payload.status === "published" && session.role !== "admin") {
    return forbiddenResponse();
  }

  if (session.role !== "admin") {
    const existing = await getShiftScheduleByMonth(month!);
    if (existing?.status === "published") {
      return forbiddenResponse();
    }
  }

  try {
    await saveShiftSchedule(month!, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/shift-schedules failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
