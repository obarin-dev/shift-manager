import type { CalendarEntryType } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  createCalendarEntry,
  listCalendarEntries,
  type CalendarEntryWriteInput,
} from "@/lib/calendar-entry-db";

export const runtime = "nodejs";

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

function isValidDateKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if ((from && !isValidDateKey(from)) || (to && !isValidDateKey(to))) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const entries = await listCalendarEntries({
      from: from ?? undefined,
      to: to ?? undefined,
    });
    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error("[GET /api/calendar-entries]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const input = parseCalendarEntryBody(await request.json());
  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const entry = await createCalendarEntry(input);
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/calendar-entries]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

