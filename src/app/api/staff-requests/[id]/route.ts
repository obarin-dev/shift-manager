import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  deleteStaffRequest,
  updateStaffRequest,
} from "@/lib/staff-request-db";
import { getRequestOwner, parseWriteBody } from "../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const owner = await getRequestOwner(session);
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

  const { id } = await context.params;

  try {
    const staffRequest = await updateStaffRequest(owner, id, input);
    if (staffRequest === null) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (staffRequest === "locked") {
      return NextResponse.json({ error: "request_locked" }, { status: 409 });
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const owner = await getRequestOwner(session);
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await deleteStaffRequest(owner, id);
    if (deleted === false) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (deleted === "locked") {
      return NextResponse.json({ error: "request_locked" }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/staff-requests/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
