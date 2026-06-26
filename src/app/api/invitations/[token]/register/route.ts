import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  getInvitationByToken,
  InvitationInvalidError,
  registerWithInvitation,
} from "@/lib/invitation-db";
import { findActiveUserByEmail, hashPassword } from "@/lib/user-db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth-session";

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
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json({ error: "invitation_invalid" }, { status: 400 });
    }

    const existing = await findActiveUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "email_already_used" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const registeredUser = await registerWithInvitation({ token, email, passwordHash });

    const sessionToken = await createSessionToken({
      userId: registeredUser.userId,
      nurseryId: registeredUser.nurseryId,
      role: "staff",
      email: registeredUser.email,
    });
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(sessionToken));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvitationInvalidError) {
      return NextResponse.json({ error: "invitation_invalid" }, { status: 400 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "email_already_used" }, { status: 409 });
    }

    console.error("POST /api/invitations/[token]/register failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
