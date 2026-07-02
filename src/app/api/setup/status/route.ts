import { NextResponse } from "next/server";
import { isSetupRequired } from "@/lib/setup-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const setupRequired = await isSetupRequired();
    return NextResponse.json({ setupRequired });
  } catch (error) {
    console.error("[GET /api/setup/status]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
