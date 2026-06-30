import { ShiftTypeCode as ShiftTypeCodeValues, type ShiftType as PrismaShiftType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveNurseryId } from "@/lib/nursery-db";
import type { ShiftTypeCode, ShiftTypeDefinition } from "@/lib/nursery-helpers";
import {
  DEFAULT_SHIFT_TYPE_COLOR,
  getDefaultColorForShiftCode,
  normalizeShiftColor,
} from "@/lib/shift-type-colors";
import { formatDbTime, parseTimeToDate } from "@/lib/nursery-time";

export type ShiftTypeWriteInput = {
  code: ShiftTypeCode;
  name: string;
  start: string;
  end: string;
  is_active: boolean;
  sort_order: number;
  color: string;
};

function resolveShiftColor(code: ShiftTypeCode, color: string) {
  return normalizeShiftColor(color) ?? getDefaultColorForShiftCode(code) ?? DEFAULT_SHIFT_TYPE_COLOR;
}

const SHIFT_TYPE_CODES = new Set<ShiftTypeCode>(Object.values(ShiftTypeCodeValues));

export function toShiftTypeDefinition(record: PrismaShiftType): ShiftTypeDefinition {
  return {
    id: record.id,
    code: record.code as ShiftTypeCode,
    name: record.name,
    start: formatDbTime(record.start_time),
    end: formatDbTime(record.end_time),
    is_active: record.is_active,
    sort_order: record.sort_order,
    color: record.color ?? getDefaultColorForShiftCode(record.code as ShiftTypeCode),
  };
}

export function isShiftTypeSchemaError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("Unknown argument `color`") ||
    message.includes('column "color"') ||
    message.includes("color does not exist")
  );
}

async function resolveNurseryId(nurseryId?: string) {
  return nurseryId ?? getActiveNurseryId();
}

export function isValidShiftTypeCode(code: string): code is ShiftTypeCode {
  return SHIFT_TYPE_CODES.has(code as ShiftTypeCode);
}

export async function listShiftTypes(nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const rows = await prisma.shiftType.findMany({
    where: { nursery_id: resolvedNurseryId },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });

  return rows.map(toShiftTypeDefinition);
}

export async function getShiftTypeById(id: string) {
  const row = await prisma.shiftType.findUnique({ where: { id } });
  return row ? toShiftTypeDefinition(row) : null;
}

export async function createShiftType(input: ShiftTypeWriteInput, nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);

  const row = await prisma.shiftType.create({
    data: {
      nursery_id: resolvedNurseryId,
      code: input.code,
      name: input.name.trim(),
      start_time: parseTimeToDate(input.start),
      end_time: parseTimeToDate(input.end),
      is_active: input.is_active,
      sort_order: input.sort_order,
      color: resolveShiftColor(input.code, input.color),
    },
  });

  return toShiftTypeDefinition(row);
}

export async function updateShiftType(id: string, input: ShiftTypeWriteInput) {
  const existing = await prisma.shiftType.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  const row = await prisma.shiftType.update({
    where: { id },
    data: {
      code: input.code,
      name: input.name.trim(),
      start_time: parseTimeToDate(input.start),
      end_time: parseTimeToDate(input.end),
      is_active: input.is_active,
      sort_order: input.sort_order,
      color: resolveShiftColor(input.code, input.color),
    },
  });

  return toShiftTypeDefinition(row);
}

export async function deleteShiftType(id: string) {
  await prisma.shiftType.delete({ where: { id } });
}
