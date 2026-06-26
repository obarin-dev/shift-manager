import { NextResponse } from "next/server";
import {
  createShiftType,
  isShiftTypeSchemaError,
  isValidShiftTypeCode,
  listShiftTypes,
  type ShiftTypeWriteInput,
} from "@/lib/shift-type-db";
import type { ShiftTypeCode } from "@/lib/nursery-helpers";
import { DEFAULT_SHIFT_TYPE_COLOR } from "@/lib/shift-type-colors";
import { getSession } from "@/lib/auth-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

function parseShiftTypeBody(body: unknown): ShiftTypeWriteInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const code = payload.code;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const start = typeof payload.start === "string" ? payload.start : "";
  const end = typeof payload.end === "string" ? payload.end : "";
  const sort_order =
    typeof payload.sort_order === "number"
      ? payload.sort_order
      : Number(payload.sort_order);

  if (
    typeof code !== "string" ||
    !isValidShiftTypeCode(code) ||
    !name ||
    !start ||
    !end ||
    Number.isNaN(sort_order)
  ) {
    return null;
  }

  const color =
    typeof payload.color === "string" ? payload.color : DEFAULT_SHIFT_TYPE_COLOR;

  return {
    code: code as ShiftTypeCode,
    name,
    start,
    end,
    is_active: payload.is_active !== false,
    sort_order,
    color,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const shiftTypes = await listShiftTypes();
    return NextResponse.json({ data: shiftTypes });
  } catch (error) {
    console.error("[GET /api/shift-types]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "admin") return forbiddenResponse();

  const input = parseShiftTypeBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const shiftType = await createShiftType(input);
    return NextResponse.json({ data: shiftType }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/shift-types]", error);
    if (isShiftTypeSchemaError(error)) {
      return NextResponse.json(
        {
          error: "schema_outdated",
          message:
            "データベースまたは Prisma の更新が未反映です。`npx prisma migrate dev` 実行後、開発サーバーを再起動してください。",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
