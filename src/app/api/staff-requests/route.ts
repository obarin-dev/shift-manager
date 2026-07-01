import { NextResponse } from "next/server";
import { getSession, isAdminOrManager } from "@/lib/auth-session";
import {
  createStaffRequest,
  listAdminStaffRequestGroups,
  listAdminStaffRequestGroupsForMonth,
  listStaffRequests,
} from "@/lib/staff-request-db";
import { getRequestOwner, parseWriteBody } from "./_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const owner = await getRequestOwner(session);
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const scope = params.get("scope");

  if (scope === "admin") {
    if (!isAdminOrManager(owner.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const month = params.get("month");
    if (month) {
      const monthNum = /^\d{4}-\d{2}$/.test(month) ? Number(month.slice(5, 7)) : 0;
      if (monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ error: "invalid_query" }, { status: 400 });
      }
    }

    try {
      const data = month
        ? await listAdminStaffRequestGroupsForMonth(owner.nurseryId, month)
        : await listAdminStaffRequestGroups(owner.nurseryId);
      return NextResponse.json({ data });
    } catch (error) {
      console.error("[GET /api/staff-requests?scope=admin]", error);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  }

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
  const owner = await getRequestOwner(session);
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isAdminOrManager(owner.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
