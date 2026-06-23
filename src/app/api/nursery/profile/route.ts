import { NextResponse } from "next/server";
import {
  getPrimaryNurseryProfile,
  updatePrimaryNurseryProfile,
} from "@/lib/nursery-db";
import type { NurseryProfile } from "@/lib/mock-nursery-info";

export const runtime = "nodejs";

function parseProfileBody(body: unknown): NurseryProfile | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const address = typeof payload.address === "string" ? payload.address : "";
  const phone_number =
    typeof payload.phone_number === "string" ? payload.phone_number : "";
  const open_time = typeof payload.open_time === "string" ? payload.open_time : "";
  const close_time = typeof payload.close_time === "string" ? payload.close_time : "";
  const extended_close_time =
    typeof payload.extended_close_time === "string"
      ? payload.extended_close_time
      : "";

  if (!name || !open_time || !close_time) {
    return null;
  }

  return {
    name,
    address,
    phone_number,
    open_time,
    close_time,
    extended_close_time,
  };
}

export async function GET() {
  try {
    const profile = await getPrimaryNurseryProfile();

    if (!profile) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error("[GET /api/nursery/profile]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const input = parseProfileBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const profile = await updatePrimaryNurseryProfile(input);

    if (!profile) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error("[PATCH /api/nursery/profile]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
