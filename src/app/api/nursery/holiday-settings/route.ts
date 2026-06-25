import { NextResponse } from "next/server";
import {
  getHolidaySettings,
  updateHolidaySettings,
} from "@/lib/nursery-holiday-settings-db";
import type { NurseryClosedDay, NurseryRestSettings } from "@/lib/nursery-helpers";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

function parseClosedDay(value: unknown): NurseryClosedDay | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const date = typeof row.date === "string" ? row.date : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";

  if (!id || !date || !title) {
    return null;
  }

  return {
    id,
    date,
    title,
    repeats_annually: Boolean(row.repeats_annually),
  };
}

function parseHolidaySettingsBody(body: unknown): NurseryRestSettings | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const weeklyRaw = payload.weekly_closed_days;

  if (!Array.isArray(weeklyRaw)) {
    return null;
  }

  const weekly_closed_days = weeklyRaw.filter(
    (day): day is number => typeof day === "number" && day >= 0 && day <= 6,
  );

  const closedRaw = payload.closed_days;
  if (!Array.isArray(closedRaw)) {
    return null;
  }

  const closed_days: NurseryClosedDay[] = [];
  for (const item of closedRaw) {
    const parsed = parseClosedDay(item);
    if (!parsed) {
      return null;
    }
    closed_days.push(parsed);
  }

  return {
    weekly_closed_days,
    close_on_public_holidays: Boolean(payload.close_on_public_holidays),
    closed_days,
  };
}

export async function GET() {
  try {
    const settings = await getHolidaySettings();

    if (!settings) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[GET /api/nursery/holiday-settings]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  const input = parseHolidaySettingsBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const settings = await updateHolidaySettings(input);

    if (!settings) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[PATCH /api/nursery/holiday-settings]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
