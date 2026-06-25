import { NextResponse } from "next/server";
import { generateShiftScheduleWithAi } from "@/lib/shift-schedule-ai";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

function isValidMonthKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  const month = new URL(request.url).searchParams.get("month");
  if (!isValidMonthKey(month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  try {
    const result = await generateShiftScheduleWithAi(month!);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_master_data") {
      return NextResponse.json({ error: "missing_master_data" }, { status: 400 });
    }

    console.error("POST /api/shift-schedules/generate failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
