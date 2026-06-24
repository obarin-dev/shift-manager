import { NextResponse } from "next/server";
import { getInvitationByToken, markInvitationUsed } from "@/lib/invitation-db";
import { createUser, findActiveUserByEmail } from "@/lib/user-db";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

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
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: "invitation_not_found" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "invitation_invalid" }, { status: 400 });
    }

    const existing = await findActiveUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "email_already_used" }, { status: 409 });
    }

    await createUser({
      nurseryId: invitation.nurseryId,
      staffId: invitation.staffId,
      email,
      password,
      role: "staff",
    });

    await markInvitationUsed(token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/invitations/[token]/register failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
