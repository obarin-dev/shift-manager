import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  deleteStaffRequest,
  type StaffRequestOwner,
  type StaffRequestTypeLabel,
  type StaffRequestWriteInput,
  updateStaffRequest,
} from "@/lib/staff-request-db";
import { getAuthAccountByUserId } from "@/lib/user-db";

export const runtime = "nodejs";

const REQUEST_TYPES = new Set<StaffRequestTypeLabel>([
  "休み希望",
  "出勤希望",
  "時間相談",
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    typeof type !== "string" ||
    !REQUEST_TYPES.has(type as StaffRequestTypeLabel) ||
    !time
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

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await getRequestOwner();
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const input = parseWriteBody(await request.json());
  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const staffRequest = await updateStaffRequest(owner, id, input);
    if (staffRequest === null) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (staffRequest === "duplicate") {
      return NextResponse.json({ error: "duplicate_request" }, { status: 409 });
    }

    return NextResponse.json({ data: staffRequest });
  } catch (error) {
    console.error("[PATCH /api/staff-requests/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owner = await getRequestOwner();
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await deleteStaffRequest(owner, id);
    if (!deleted) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/staff-requests/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
