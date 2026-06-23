import { NextResponse } from "next/server";
import {
  deleteShiftType,
  getShiftTypeById,
  isShiftTypeSchemaError,
  isValidShiftTypeCode,
  updateShiftType,
  type ShiftTypeWriteInput,
} from "@/lib/shift-type-db";
import type { ShiftTypeCode } from "@/lib/mock-nursery-info";
import { DEFAULT_SHIFT_TYPE_COLOR } from "@/lib/shift-type-colors";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const shiftType = await getShiftTypeById(id);

    if (!shiftType) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: shiftType });
  } catch (error) {
    console.error("[GET /api/shift-types/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const input = parseShiftTypeBody(await request.json());

  if (!input) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const shiftType = await updateShiftType(id, input);

    if (!shiftType) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: shiftType });
  } catch (error) {
    console.error("[PATCH /api/shift-types/[id]]", error);
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

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const existing = await getShiftTypeById(id);

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await deleteShiftType(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/shift-types/[id]]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
