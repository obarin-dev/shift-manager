import { NextResponse } from "next/server";
import { createInitialSetup, SetupAlreadyDoneError } from "@/lib/setup-db";

export const runtime = "nodejs";

type SetupBody = {
  nurseryName?: unknown;
  address?: unknown;
  phoneNumber?: unknown;
  openTime?: unknown;
  closeTime?: unknown;
  adminName?: unknown;
  adminEmail?: unknown;
  adminPassword?: unknown;
};

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as SetupBody;

  const nurseryName = typeof b.nurseryName === "string" ? b.nurseryName.trim() : "";
  const address = typeof b.address === "string" ? b.address : "";
  const phoneNumber = typeof b.phoneNumber === "string" ? b.phoneNumber : "";
  const openTime = typeof b.openTime === "string" ? b.openTime.trim() : "";
  const closeTime = typeof b.closeTime === "string" ? b.closeTime.trim() : "";
  const adminName = typeof b.adminName === "string" ? b.adminName.trim() : "";
  const adminEmail = typeof b.adminEmail === "string" ? b.adminEmail.trim() : "";
  const adminPassword = typeof b.adminPassword === "string" ? b.adminPassword : "";

  if (!nurseryName || !openTime || !closeTime || !adminName || !adminEmail || !adminPassword) {
    return null;
  }

  if (adminPassword.length < 8) return null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(adminEmail)) return null;

  return { nurseryName, address, phoneNumber, openTime, closeTime, adminName, adminEmail, adminPassword };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = parseBody(body);
  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await createInitialSetup(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SetupAlreadyDoneError) {
      return NextResponse.json({ error: "already_setup" }, { status: 409 });
    }
    console.error("[POST /api/setup]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
