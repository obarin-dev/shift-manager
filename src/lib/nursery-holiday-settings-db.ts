import type { CalendarEntry } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNurseryId } from "@/lib/nursery-db";
import type { NurseryClosedDay, NurseryRestSettings } from "@/lib/nursery-helpers";
import { formatDbDate, parseDateToDb } from "@/lib/nursery-time";

function toClosedDay(record: CalendarEntry): NurseryClosedDay {
  return {
    id: record.id,
    date: formatDbDate(record.entry_date),
    title: record.title,
    repeats_annually: record.repeats_annually,
  };
}


export async function getHolidaySettings(nurseryId?: string): Promise<NurseryRestSettings | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);
  const nursery = await prisma.nursery.findUnique({
    where: { id: resolvedNurseryId },
    include: {
      calendar_entries: {
        where: { entry_type: "closure" },
        orderBy: [{ entry_date: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!nursery) {
    return null;
  }

  return {
    weekly_closed_days: nursery.weekly_closed_weekdays,
    close_on_public_holidays: nursery.close_on_public_holidays,
    closed_days: nursery.calendar_entries.map(toClosedDay),
  };
}

export async function updateHolidaySettings(
  input: NurseryRestSettings,
  nurseryId?: string,
): Promise<NurseryRestSettings | null> {
  const resolvedNurseryId = await resolveNurseryId(nurseryId);

  await prisma.$transaction(async (tx) => {
    await tx.nursery.update({
      where: { id: resolvedNurseryId },
      data: {
        weekly_closed_weekdays: input.weekly_closed_days,
        close_on_public_holidays: input.close_on_public_holidays,
      },
    });

    await tx.calendarEntry.deleteMany({
      where: {
        nursery_id: resolvedNurseryId,
        entry_type: "closure",
      },
    });

    if (input.closed_days.length > 0) {
      await tx.calendarEntry.createMany({
        data: input.closed_days.map((day) => ({
          id: day.id,
          nursery_id: resolvedNurseryId,
          entry_date: parseDateToDb(day.date),
          entry_type: "closure",
          title: day.title.trim(),
          repeats_annually: day.repeats_annually,
        })),
      });
    }
  });

  return getHolidaySettings(resolvedNurseryId);
}
