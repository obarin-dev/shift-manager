import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth-session";
import type { UserRole } from "@/lib/mock-auth";
import {
  findActiveUserByEmail,
  verifyPassword,
} from "@/lib/user-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  try {
    const user = await findActiveUserByEmail(email);

    if (!user) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      nurseryId: user.nursery_id,
      role: user.role as UserRole,
      email: user.email,
    });

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
