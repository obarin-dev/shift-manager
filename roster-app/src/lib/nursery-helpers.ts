// roster-appは園マスタ・カレンダードメインを持たないため、体制表の表示
// (「本日の行事」欄)に必要な最小限の型・関数だけをここに置く(本体の一部)。
import { parseTimeInput } from "@/lib/classroom-helpers";

export type CalendarEntryType = "event" | "closure" | "special_hours";

export type NurseryCalendarEntry = {
  id: string;
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

function formatTimeRange(start: string, end: string) {
  return `${start}-${end}`;
}

function formatDisplayTime(time: string) {
  const parsed = parseTimeInput(time);
  if (!parsed) {
    return time;
  }

  const match = parsed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return time;
  }

  const hour = Number(match[1]);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export function formatCalendarEntrySummary(entry: NurseryCalendarEntry) {
  if (entry.entry_type === "closure") {
    return entry.title;
  }

  if (entry.entry_type === "special_hours") {
    const range =
      entry.open_time && entry.close_time ? formatTimeRange(entry.open_time, entry.close_time) : "";
    return range ? `${entry.title}（${range}）` : entry.title;
  }

  if (entry.start_time) {
    return `${formatDisplayTime(entry.start_time)} ${entry.title}`;
  }

  return entry.title;
}
