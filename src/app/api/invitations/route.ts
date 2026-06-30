import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getSession, isAdminOrManager } from "@/lib/auth-session";
import {
  createInvitation,
  listPendingInvitations,
  type InvitationMethod,
} from "@/lib/invitation-db";
import { getPrimaryNursery, DEFAULT_NURSERY_ID } from "@/lib/nursery-db";

export const runtime = "nodejs";

const VALID_METHODS = new Set<InvitationMethod>(["qr", "url"]);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminOrManager(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const nursery = await getPrimaryNursery();
    const nurseryId = nursery?.id ?? DEFAULT_NURSERY_ID;
    const invitations = await listPendingInvitations(nurseryId);
    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error("GET /api/invitations failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminOrManager(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.method !== "string" || !VALID_METHODS.has(payload.method as InvitationMethod)) {
    return NextResponse.json({ error: "invalid_method" }, { status: 400 });
  }

  const staffId = typeof payload.staff_id === "string" ? payload.staff_id : null;
  const adminNote = typeof payload.admin_note === "string" ? payload.admin_note.trim() : "";
  const method = payload.method as InvitationMethod;
  const expiryHours =
    typeof payload.expiry_hours === "number" &&
    payload.expiry_hours > 0 &&
    payload.expiry_hours <= 720
      ? payload.expiry_hours
      : 168;

  try {
    const nursery = await getPrimaryNursery();
    const nurseryId = nursery?.id ?? DEFAULT_NURSERY_ID;
    const invitation = await createInvitation({
      nurseryId,
      staffId,
      adminNote,
      method,
      expiryHours,
    });

    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json({ error: "staff_not_found" }, { status: 400 });
    }

    console.error("POST /api/invitations failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
