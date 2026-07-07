import type { Prisma } from "@/generated/prisma/client";
import { listClassrooms } from "@/lib/classroom-db";
import type { Classroom } from "@/lib/classroom-helpers";
import { sortClassrooms } from "@/lib/classroom-helpers";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import { migrateRosterAssignments, type RosterCellAssignment, type RosterSheetRow } from "@/lib/roster-helpers";
import { formatDbDate, parseDateToDb } from "@/lib/nursery-time";

export type { RosterSheetRow };

export type RosterSheetPayload = {
  rows: RosterSheetRow[];
  assignments: RosterCellAssignment[];
  todayChildCounts: Record<string, number>;
  slotCountsByRowAndClass: Record<string, number>;
};


function isRosterSheetPayload(value: unknown): value is RosterSheetPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Partial<RosterSheetPayload>;
  return Array.isArray(body.rows) && Array.isArray(body.assignments);
}

function toRosterSheetPayload(
  value: Prisma.JsonValue,
  classrooms: Classroom[],
): RosterSheetPayload | null {
  if (!isRosterSheetPayload(value)) {
    return null;
  }

  return {
    rows: value.rows,
    assignments: migrateRosterAssignments(value.rows, value.assignments, classrooms),
    todayChildCounts: value.todayChildCounts ?? {},
    slotCountsByRowAndClass: value.slotCountsByRowAndClass ?? {},
  };
}

export function normalizeRosterSheetPayload(
  input: unknown,
  classrooms: Classroom[],
): RosterSheetPayload | null {
  if (!isRosterSheetPayload(input)) {
    return null;
  }

  return {
    rows: input.rows,
    assignments: migrateRosterAssignments(input.rows, input.assignments, classrooms),
    todayChildCounts: input.todayChildCounts ?? {},
    slotCountsByRowAndClass: input.slotCountsByRowAndClass ?? {},
  };
}

export async function getRosterSheetByDate(
  dateKey: string,
  nurseryId?: string,
): Promise<RosterSheetPayload | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const row = await prisma.rosterSheet.findUnique({
    where: {
      nursery_id_entry_date: {
        nursery_id: resolvedNurseryId,
        entry_date: parseDateToDb(dateKey),
      },
    },
  });

  if (!row) {
    return null;
  }

  const classrooms = sortClassrooms(await listClassrooms(resolvedNurseryId));
  return toRosterSheetPayload(row.payload, classrooms);
}

export async function saveRosterSheet(
  dateKey: string,
  payload: RosterSheetPayload,
  nurseryId?: string,
) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const entryDate = parseDateToDb(dateKey);
  const jsonPayload = payload as unknown as Prisma.InputJsonValue;

  await prisma.rosterSheet.upsert({
    where: {
      nursery_id_entry_date: {
        nursery_id: resolvedNurseryId,
        entry_date: entryDate,
      },
    },
    create: {
      nursery_id: resolvedNurseryId,
      entry_date: entryDate,
      payload: jsonPayload,
    },
    update: {
      payload: jsonPayload,
    },
  });
}
