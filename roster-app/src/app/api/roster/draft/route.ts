import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";
import { generateRosterDraftFromShift } from "@/lib/roster-draft";

export const runtime = "nodejs";

function isValidDateKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  const date = new URL(request.url).searchParams.get("date");
  if (!isValidDateKey(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const result = await generateRosterDraftFromShift(date!);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/roster/draft failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
