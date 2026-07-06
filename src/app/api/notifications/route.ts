import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notification-db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await listNotifications(session.userId);
    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await markAllNotificationsRead(session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
