import { NextResponse } from "next/server";
import { listClassrooms } from "@/lib/classroom-db";
import { sortClassrooms } from "@/lib/mock-classes";
import {
  getRosterSheetByDate,
  normalizeRosterSheetPayload,
  saveRosterSheet,
} from "@/lib/roster-db";

export const runtime = "nodejs";

function isValidDateKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (!isValidDateKey(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const data = await getRosterSheetByDate(date!);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/roster failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (!isValidDateKey(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const classrooms = sortClassrooms(await listClassrooms());
    const payload = normalizeRosterSheetPayload(body, classrooms);
    if (!payload) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    await saveRosterSheet(date!, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/roster failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
