import type { CalendarEntryType } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  deleteCalendarEntry,
  getCalendarEntryById,
  updateCalendarEntry,
  type CalendarEntryWriteInput,
} from "@/lib/calendar-entry-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isCalendarEntryType(value: unknown): value is CalendarEntryType {
  return value === "event" || value === "special_hours" || value === "closure";
}

function parseCalendarEntryBody(body: unknown): CalendarEntryWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const entry_date = typeof payload.entry_date === "string" ? payload.entry_date : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const entry_type = payload.entry_type;

  if (!entry_date || !title || !isCalendarEntryType(entry_type)) {
    return null;
  }

  return {
    entry_date,
    title,
    entry_type,
    start_time: typeof payload.start_time === "string" ? payload.start_time : undefined,
    end_time: typeof payload.end_time === "string" ? payload.end_time : undefined,
    open_time: typeof payload.open_time === "string" ? payload.open_time : undefined,
    close_time: typeof payload.close_time === "string" ? payload.close_time : undefined,
    extended_close_time:
      typeof payload.extended_close_time === "string"
        ? payload.extended_close_time
        : undefined,
    note: typeof payload.note === "string" ? payload.note : undefined,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const entry = await getCalendarEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[GET /api/calendar-entries/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const input = parseCalendarEntryBody(await request.json());
  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const entry = await updateCalendarEntry(id, input);
    if (!entry) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[PATCH /api/calendar-entries/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const existing = await getCalendarEntryById(id);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await deleteCalendarEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/calendar-entries/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

