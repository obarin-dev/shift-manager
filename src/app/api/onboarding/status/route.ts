import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
import { getActiveNurseryId, getOnboardingStatus } from "@/lib/nursery-db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return forbiddenResponse();

  const nurseryId = await getActiveNurseryId();
  const status = await getOnboardingStatus(nurseryId);

  return NextResponse.json(status);
}
