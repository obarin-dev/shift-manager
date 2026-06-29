import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  createStaffRequest,
  listAdminStaffRequestGroups,
  listAdminStaffRequestGroupsForMonth,
  listStaffRequests,
  type StaffRequestOwner,
  type StaffRequestTypeLabel,
  type StaffRequestWriteInput,
} from "@/lib/staff-request-db";
import { getAuthAccountByUserId } from "@/lib/user-db";
import { isValidCalendarDate } from "@/lib/nursery-time";
import type { UserRole } from "@/lib/auth-session";

export const runtime = "nodejs";

const REQUEST_TYPES = new Set<StaffRequestTypeLabel>([
  "休み希望",
  "出勤希望",
  "時間相談",
]);

const VALID_TIMES = new Set(["終日", "午前のみ", "午後のみ", "早番希望", "遅番不可"]);

async function getRequestOwner(): Promise<StaffRequestOwner | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const account = await getAuthAccountByUserId(session.userId);
  if (!account) {
    return null;
  }

  return {
    nurseryId: account.nurseryId,
    userId: account.userId,
    staffId: account.staffId,
  };
}

function parseWriteBody(body: unknown): StaffRequestWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const date = typeof payload.date === "string" ? payload.date : "";
  const type = payload.type;
  const time = typeof payload.time === "string" ? payload.time.trim() : "";
  const memo = typeof payload.memo === "string" ? payload.memo : "";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !isValidCalendarDate(date) ||
    typeof type !== "string" ||
    !REQUEST_TYPES.has(type as StaffRequestTypeLabel) ||
    !VALID_TIMES.has(time) ||
    memo.length > 200
  ) {
    return null;
  }

  return {
    date,
    type: type as StaffRequestTypeLabel,
    time,
    memo,
  };
}

function canViewAdminStaffRequests(role: UserRole) {
  return role === "admin" || role === "manager";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await getAuthAccountByUserId(session.userId);
  if (!account) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const scope = params.get("scope");

  if (scope === "admin") {
    if (!canViewAdminStaffRequests(account.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const month = params.get("month");
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    try {
      const data = month
        ? await listAdminStaffRequestGroupsForMonth(account.nurseryId, month)
        : await listAdminStaffRequestGroups(account.nurseryId);
      return NextResponse.json({ data });
    } catch (error) {
      console.error("[GET /api/staff-requests?scope=admin]", error);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  }

  const owner: StaffRequestOwner = {
    nurseryId: account.nurseryId,
    userId: account.userId,
    staffId: account.staffId,
  };

  try {
    const requests = await listStaffRequests(owner);
    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error("[GET /api/staff-requests]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.role !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const owner = await getRequestOwner();
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const input = parseWriteBody(body);
  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const staffRequest = await createStaffRequest(owner, input);
    if (staffRequest === "duplicate") {
      return NextResponse.json({ error: "duplicate_request" }, { status: 409 });
    }
    return NextResponse.json({ data: staffRequest }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/staff-requests]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
