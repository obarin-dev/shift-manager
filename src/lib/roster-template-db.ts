import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import type { RosterTemplatePayload } from "@/lib/roster-helpers";

export type { RosterTemplatePayload };

function isRosterTemplatePayload(value: unknown): value is RosterTemplatePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RosterTemplatePayload>;
  return Array.isArray(v.rows);
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
