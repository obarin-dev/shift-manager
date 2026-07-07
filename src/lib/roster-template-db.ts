import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import type { RosterTemplatePayload } from "@/lib/roster-helpers";

export type { RosterTemplatePayload };

export function isRosterTemplatePayload(value: unknown): value is RosterTemplatePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RosterTemplatePayload>;
  if (!Array.isArray(v.rows)) return false;
  if (!v.rows.every((row) => {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    return typeof r.id === "string" && (r.kind === "schedule" || r.kind === "note");
  })) return false;
  if (v.slotCountsByRowAndClass !== undefined) {
    if (typeof v.slotCountsByRowAndClass !== "object" || Array.isArray(v.slotCountsByRowAndClass)) return false;
    if (!Object.values(v.slotCountsByRowAndClass).every((n) => typeof n === "number")) return false;
  }
  return true;
}

function toRosterTemplatePayload(value: Prisma.JsonValue): RosterTemplatePayload | null {
  if (!isRosterTemplatePayload(value)) return null;
  return {
    rows: value.rows,
    slotCountsByRowAndClass: value.slotCountsByRowAndClass ?? {},
  };
}

export async function getRosterTemplate(nurseryId?: string): Promise<RosterTemplatePayload | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const row = await prisma.rosterTemplate.findUnique({
    where: { nursery_id: resolvedNurseryId },
  });
  if (!row) return null;
  return toRosterTemplatePayload(row.payload);
}

export async function saveRosterTemplate(
  payload: RosterTemplatePayload,
  nurseryId?: string,
): Promise<void> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const jsonPayload = payload as unknown as Prisma.InputJsonValue;
  await prisma.rosterTemplate.upsert({
    where: { nursery_id: resolvedNurseryId },
    create: { nursery_id: resolvedNurseryId, payload: jsonPayload },
    update: { payload: jsonPayload },
  });
}
