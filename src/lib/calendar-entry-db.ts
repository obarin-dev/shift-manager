import type {
  CalendarEntry as PrismaCalendarEntry,
  CalendarEntryType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_NURSERY_ID, getPrimaryNursery } from "@/lib/nursery-db";
import type { NurseryCalendarEntry } from "@/lib/mock-nursery-info";
import { formatDbDate, formatDbTime, parseDateToDb, parseTimeToDate } from "@/lib/nursery-time";

export type CalendarEntryWriteInput = {
  entry_date: string;
  entry_type: CalendarEntryType;
  title: string;
  start_time?: string;
  end_time?: string;
  open_time?: string;
  close_time?: string;
  extended_close_time?: string;
  note?: string;
};

type ListCalendarEntriesParams = {
  nurseryId?: string;
  from?: string;
  to?: string;
};

function toNullableTime(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? parseTimeToDate(trimmed) : null;
}

function toNullableNote(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function toCalendarEntry(record: PrismaCalendarEntry): NurseryCalendarEntry {
  return {
    id: record.id,
    entry_date: formatDbDate(record.entry_date),
    entry_type: record.entry_type,
    title: record.title,
    start_time: record.start_time ? formatDbTime(record.start_time) : undefined,
    end_time: record.end_time ? formatDbTime(record.end_time) : undefined,
    open_time: record.open_time ? formatDbTime(record.open_time) : undefined,
    close_time: record.close_time ? formatDbTime(record.close_time) : undefined,
    extended_close_time: record.extended_close_time
      ? formatDbTime(record.extended_close_time)
      : undefined,
    note: record.note ?? undefined,
  };
}

async function resolveNurseryId(nurseryId?: string) {
  if (nurseryId) {
    return nurseryId;
  }

  const nursery = await getPrimaryNursery();
  return nursery?.id ?? DEFAULT_NURSERY_ID;
}

export async function listCalendarEntries(params: ListCalendarEntriesParams = {}) {
  const nurseryId = await resolveNurseryId(params.nurseryId);
  const rows = await prisma.calendarEntry.findMany({
    where: {
      nursery_id: nurseryId,
      entry_type: { in: ["event", "special_hours"] },
      ...(params.from || params.to
        ? {
            entry_date: {
              ...(params.from ? { gte: parseDateToDb(params.from) } : {}),
              ...(params.to ? { lte: parseDateToDb(params.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ entry_date: "asc" }, { start_time: "asc" }, { title: "asc" }],
  });

  return rows.map(toCalendarEntry);
}

export async function createCalendarEntry(input: CalendarEntryWriteInput, nurseryId?: string) {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const row = await prisma.calendarEntry.create({
    data: {
      nursery_id: resolvedNurseryId,
      entry_date: parseDateToDb(input.entry_date),
      entry_type: input.entry_type,
      title: input.title.trim(),
      start_time: toNullableTime(input.start_time),
      end_time: toNullableTime(input.end_time),
      open_time: toNullableTime(input.open_time),
      close_time: toNullableTime(input.close_time),
      extended_close_time: toNullableTime(input.extended_close_time),
      note: toNullableNote(input.note),
      repeats_annually: false,
    },
  });

  return toCalendarEntry(row);
}

export async function updateCalendarEntry(id: string, input: CalendarEntryWriteInput) {
  const existing = await prisma.calendarEntry.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const row = await prisma.calendarEntry.update({
    where: { id },
    data: {
      entry_date: parseDateToDb(input.entry_date),
      entry_type: input.entry_type,
      title: input.title.trim(),
      start_time: toNullableTime(input.start_time),
      end_time: toNullableTime(input.end_time),
      open_time: toNullableTime(input.open_time),
      close_time: toNullableTime(input.close_time),
      extended_close_time: toNullableTime(input.extended_close_time),
      note: toNullableNote(input.note),
    },
  });

  return toCalendarEntry(row);
}

export async function getCalendarEntryById(id: string) {
  const row = await prisma.calendarEntry.findUnique({ where: { id } });
  return row ? toCalendarEntry(row) : null;
}

export async function deleteCalendarEntry(id: string) {
  await prisma.calendarEntry.delete({ where: { id } });
}

