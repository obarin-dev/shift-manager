import { NextResponse } from "next/server";
import { AuthConfigError, setSessionCookie } from "@/lib/auth-session";
import type { UserRole } from "@/lib/auth-session";
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
    const staff = await findActiveUserByEmail(email);

    if (!staff || !staff.password_hash || !staff.role) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(password, staff.password_hash);

    if (!passwordMatches) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    await setSessionCookie({
      userId: staff.id,
      nurseryId: staff.nursery_id,
      role: staff.role as UserRole,
      email: staff.email ?? email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("Auth config error on login:", error);
    } else {
      console.error("POST /api/auth/login failed:", error);
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
