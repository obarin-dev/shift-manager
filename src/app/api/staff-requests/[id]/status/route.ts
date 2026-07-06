import { NextResponse } from "next/server";
import { getSession, isAdminOrManager } from "@/lib/auth-session";
import { getRequestOwner } from "../../_shared";
import { findRequestForStatusUpdate, setRequestStatus } from "@/lib/staff-request-db";
import { createRequestStatusNotification } from "@/lib/notification-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_STATUSES = new Set(["approved", "needs_review", "submitted"]);

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const owner = await getRequestOwner(session);
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminOrManager(owner.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const status = payload.status;
  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const existing = await findRequestForStatusUpdate(owner.nurseryId, id);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (existing.staff_id === owner.staffId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const updated = await setRequestStatus(
      owner.nurseryId,
      id,
      status as "approved" | "needs_review" | "submitted",
    );
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (status !== "submitted" && existing.status !== status) {
      await createRequestStatusNotification(
        owner.nurseryId,
        existing.staff_id,
        id,
        status as "approved" | "needs_review",
      );
    }

    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error("[PATCH /api/staff-requests/[id]/status]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
