import type { NurseryClosedDay, NurseryRestSettings } from "@/lib/nursery-helpers";
import {
  getJapanesePublicHolidays,
  type JapanesePublicHoliday,
} from "@/lib/japanese-public-holidays";

function parseDateParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return { year, month, day };
}

function isSameMonthDay(dateKey: string, target: string) {
  const date = parseDateParts(dateKey);
  const row = parseDateParts(target);
  return date.month === row.month && date.day === row.day;
}

export function getClosedDayForDate(
  dateKey: string,
  settings: NurseryRestSettings | null,
): NurseryClosedDay | null {
  if (!settings) {
    return null;
  }

  for (const closedDay of settings.closed_days) {
    if (closedDay.repeats_annually) {
      if (isSameMonthDay(dateKey, closedDay.date)) {
        return closedDay;
      }
      continue;
    }

    if (closedDay.date === dateKey) {
      return closedDay;
    }
  }

  return null;
}

export function isClosedDate(
  dateKey: string,
  settings: NurseryRestSettings | null,
): boolean {
  if (!settings) {
    return false;
  }

  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = date.getDay();

  if (settings.weekly_closed_days.includes(weekday)) {
    return true;
  }

  if (settings.close_on_public_holidays) {
    const year = Number(dateKey.slice(0, 4));
    const holidays = getJapanesePublicHolidays(year);
    if (holidays.some((holiday) => holiday.date === dateKey)) {
      return true;
    }
  }

  return getClosedDayForDate(dateKey, settings) !== null;
}

export function getPublicHolidayForDate(
  dateKey: string,
  settings: NurseryRestSettings | null,
): JapanesePublicHoliday | null {
  if (!settings?.close_on_public_holidays) {
    return null;
  }

  const year = Number(dateKey.slice(0, 4));
  const holidays = getJapanesePublicHolidays(year);
  return holidays.find((holiday) => holiday.date === dateKey) ?? null;
}

