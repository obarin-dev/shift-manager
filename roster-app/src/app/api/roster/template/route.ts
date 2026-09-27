import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";
import { getRosterTemplate, saveRosterTemplate, isRosterTemplatePayload } from "@/lib/roster-template-db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  try {
    const data = await getRosterTemplate();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/roster/template failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!isRosterTemplatePayload(body)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await saveRosterTemplate({
      rows: body.rows,
      slotCountsByRowAndClass: body.slotCountsByRowAndClass ?? {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/roster/template failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
