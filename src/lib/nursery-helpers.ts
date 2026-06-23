import { parseTimeInput } from "@/lib/classroom-helpers";

export type ShiftTypeCode = "early" | "day" | "late" | "extended" | "other";

export type ShiftTypeDefinition = {
  id: string;
  code: ShiftTypeCode;
  name: string;
  start: string;
  end: string;
  is_active: boolean;
  sort_order: number;
  color: string;
};

export type NurseryProfile = {
  name: string;
  address: string;
  phone_number: string;
  open_time: string;
  close_time: string;
  extended_close_time: string;
};

export type NurseryClosedDay = {
  id: string;
  date: string;
  title: string;
  repeats_annually: boolean;
};

export const PUBLIC_HOLIDAY_RULE_LABEL = "祝";

export type NurseryRestSettings = {
  weekly_closed_days: number[];
  close_on_public_holidays: boolean;
  closed_days: NurseryClosedDay[];
};

export type CalendarEntryType = "closure" | "special_hours" | "event";

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


export const CALENDAR_ENTRY_TYPE_OPTIONS: Array<{
  value: CalendarEntryType;
  label: string;
}> = [
  { value: "event", label: "行事・打ち合わせ" },
  { value: "closure", label: "休園" },
  { value: "special_hours", label: "臨時の開園時間" },
];

export const INITIAL_SHIFT_TYPES: ShiftTypeDefinition[] = [
  { id: "shift-early", code: "early", name: "早番", start: "07:00", end: "15:00", is_active: true, sort_order: 1, color: "#BFDBFE" },
  { id: "shift-day", code: "day", name: "日勤", start: "09:00", end: "17:00", is_active: true, sort_order: 2, color: "#BBF7D0" },
  { id: "shift-late", code: "late", name: "遅番", start: "11:00", end: "19:00", is_active: true, sort_order: 3, color: "#FED7AA" },
];

export const INITIAL_NURSERY_PROFILE: NurseryProfile = {
  name: "星の子保育園",
  address: "東京都世田谷区星の子 1-2-3",
  phone_number: "03-1234-5678",
  open_time: "07:00",
  close_time: "18:00",
  extended_close_time: "19:00",
};

export const INITIAL_NURSERY_REST: NurseryRestSettings = {
  weekly_closed_days: [0],
  close_on_public_holidays: true,
  closed_days: [
    {
      id: "rest-summer",
      date: "2026-08-13",
      title: "夏休み",
      repeats_annually: false,
    },
    {
      id: "rest-year-end",
      date: "2026-12-29",
      title: "年末休園",
      repeats_annually: false,
    },
  ],
};

export const INITIAL_NURSERY_CALENDAR_ENTRIES: NurseryCalendarEntry[] = [
  {
    id: "cal-1",
    entry_date: "2026-05-27",
    entry_type: "event",
    title: "わくわく体育",
    start_time: "09:30",
  },
  {
    id: "cal-2",
    entry_date: "2026-05-27",
    entry_type: "event",
    title: "避難訓練",
    start_time: "10:30",
  },
  {
    id: "cal-3",
    entry_date: "2026-05-27",
    entry_type: "event",
    title: "誕生日会打ち合わせ",
    start_time: "11:00",
  },
  {
    id: "cal-4",
    entry_date: "2026-05-27",
    entry_type: "event",
    title: "昼勉強会",
    start_time: "12:30",
  },
  {
    id: "cal-5",
    entry_date: "2026-05-27",
    entry_type: "event",
    title: "こうちゃん療育",
    start_time: "14:00",
  },
  {
    id: "cal-6",
    entry_date: "2026-05-30",
    entry_type: "closure",
    title: "休園",
  },
  {
    id: "cal-7",
    entry_date: "2026-05-15",
    entry_type: "special_hours",
    title: "短縮保育",
    open_time: "09:00",
    close_time: "15:00",
  },
];

export function createCalendarEntryId() {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isWorkShiftType(shift: Pick<ShiftTypeDefinition, "code">) {
  return shift.code !== "extended";
}

export function formatTimeRange(start: string, end: string) {
  return `${start}-${end}`;
}

export function formatDisplayTime(time: string) {
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

export function formatExtendedCareRange(
  closeTime: string,
  extendedCloseTime: string,
): string {
  if (!extendedCloseTime.trim()) {
    return "なし";
  }

  const closeMinutes = timeToMinutes(closeTime);
  const extendedMinutes = timeToMinutes(extendedCloseTime);

  if (closeMinutes === null || extendedMinutes === null) {
    return "未設定";
  }

  if (extendedMinutes <= closeMinutes) {
    return "未設定（閉園より後の時刻を設定してください）";
  }

  return `${formatDisplayTime(closeTime)} 〜 ${formatDisplayTime(extendedCloseTime)}`;
}

export function timeToMinutes(value: string) {
  const parsed = parseTimeInput(value);
  if (!parsed) {
    return null;
  }

  const match = parsed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function validateNurseryHours(
  profile: Pick<NurseryProfile, "open_time" | "close_time" | "extended_close_time">,
) {
  const errors: Partial<Record<keyof NurseryProfile, string>> = {};
  const open = timeToMinutes(profile.open_time);
  const close = timeToMinutes(profile.close_time);
  const extended = profile.extended_close_time.trim()
    ? timeToMinutes(profile.extended_close_time)
    : null;

  if (open === null) {
    errors.open_time = "開園時間を入力してください。";
  }

  if (close === null) {
    errors.close_time = "閉園時間を入力してください。";
  }

  if (open !== null && close !== null && open >= close) {
    errors.close_time = "閉園時間は開園時間より後にしてください。";
  }

  if (profile.extended_close_time.trim()) {
    if (extended === null) {
      errors.extended_close_time = "延長終了時刻を正しく入力してください。";
    } else if (close !== null && extended <= close) {
      errors.extended_close_time = "延長終了は閉園時間より後にしてください。";
    }
  }

  return errors;
}

export function getWorkShiftLatestEndMinutes(
  profile: Pick<NurseryProfile, "close_time" | "extended_close_time">,
) {
  const close = timeToMinutes(profile.close_time);
  const extended = profile.extended_close_time.trim()
    ? timeToMinutes(profile.extended_close_time)
    : null;

  if (close === null) {
    return null;
  }

  if (extended !== null && extended > close) {
    return extended;
  }

  return close;
}

export function validateShiftTypeTimes(
  shift: Pick<ShiftTypeDefinition, "start" | "end" | "code">,
  profile: Pick<NurseryProfile, "open_time" | "close_time" | "extended_close_time">,
) {
  const errors: Partial<Record<"start" | "end", string>> = {};
  const start = timeToMinutes(shift.start);
  const end = timeToMinutes(shift.end);
  const open = timeToMinutes(profile.open_time);
  const latestEnd = getWorkShiftLatestEndMinutes(profile);
  const close = timeToMinutes(profile.close_time);
  const extended = profile.extended_close_time.trim()
    ? timeToMinutes(profile.extended_close_time)
    : null;
  const usesExtended =
    close !== null && extended !== null && extended > close;

  if (start === null) {
    errors.start = "開始時刻を入力してください。";
  }

  if (end === null) {
    errors.end = "終了時刻を入力してください。";
  }

  if (start !== null && end !== null && start >= end) {
    errors.end = "終了時刻は開始時刻より後にしてください。";
  }

  if (open !== null && latestEnd !== null && start !== null && end !== null) {
    if (start < open || end > latestEnd) {
      errors.end = usesExtended
        ? "勤務区分は開園〜延長保育の終了時刻の範囲内にしてください。"
        : "勤務区分は開園〜閉園の範囲内にしてください。";
    }
  }

  return errors;
}

export type CalendarEntryFormValues = {
  entry_type: CalendarEntryType | "";
  entry_date: string;
  title: string;
  start_time: string;
  end_time: string;
  open_time: string;
  close_time: string;
  extended_close_time: string;
  note: string;
};

export function emptyCalendarEntryFormValues(date: string): CalendarEntryFormValues {
  return {
    entry_type: "event",
    entry_date: date,
    title: "",
    start_time: "",
    end_time: "",
    open_time: "",
    close_time: "",
    extended_close_time: "",
    note: "",
  };
}

export function calendarEntryToFormValues(entry: NurseryCalendarEntry): CalendarEntryFormValues {
  return {
    entry_type: entry.entry_type,
    entry_date: entry.entry_date,
    title: entry.title,
    start_time: entry.start_time ?? "",
    end_time: entry.end_time ?? "",
    open_time: entry.open_time ?? "",
    close_time: entry.close_time ?? "",
    extended_close_time: entry.extended_close_time ?? "",
    note: entry.note ?? "",
  };
}

export function validateCalendarEntryForm(values: CalendarEntryFormValues) {
  const errors: Partial<Record<keyof CalendarEntryFormValues, string>> = {};

  if (!values.entry_type) {
    errors.entry_type = "種類を選択してください。";
  }

  if (!values.entry_date) {
    errors.entry_date = "日付を選択してください。";
  }

  if (values.entry_type === "closure") {
    if (!values.title.trim()) {
      errors.title = "タイトルを入力してください。";
    }
    return errors;
  }

  if (!values.title.trim()) {
    errors.title = "タイトルを入力してください。";
  }

  if (values.entry_type === "event") {
    if (!values.start_time.trim()) {
      errors.start_time = "開始時刻を入力してください。";
    } else if (!parseTimeInput(values.start_time)) {
      errors.start_time = "時刻は HH:MM 形式で入力してください。";
    }

    if (values.end_time.trim() && !parseTimeInput(values.end_time)) {
      errors.end_time = "時刻は HH:MM 形式で入力してください。";
    }
  }

  if (values.entry_type === "special_hours") {
    const open = timeToMinutes(values.open_time);
    const close = timeToMinutes(values.close_time);

    if (open === null) {
      errors.open_time = "開園時間を入力してください。";
    }

    if (close === null) {
      errors.close_time = "閉園時間を入力してください。";
    }

    if (open !== null && close !== null && open >= close) {
      errors.close_time = "閉園時間は開園時間より後にしてください。";
    }
  }

  return errors;
}

export function buildCalendarEntryFromForm(
  values: CalendarEntryFormValues,
  id?: string,
): NurseryCalendarEntry {
  const base: NurseryCalendarEntry = {
    id: id ?? createCalendarEntryId(),
    entry_date: values.entry_date,
    entry_type: values.entry_type as CalendarEntryType,
    title: values.entry_type === "closure" ? values.title.trim() || "休園" : values.title.trim(),
    note: values.note.trim() || undefined,
  };

  if (values.entry_type === "event") {
    return {
      ...base,
      start_time: parseTimeInput(values.start_time) ?? values.start_time,
      end_time: values.end_time.trim()
        ? parseTimeInput(values.end_time) ?? values.end_time
        : undefined,
    };
  }

  if (values.entry_type === "special_hours") {
    return {
      ...base,
      open_time: parseTimeInput(values.open_time) ?? values.open_time,
      close_time: parseTimeInput(values.close_time) ?? values.close_time,
      extended_close_time: values.extended_close_time.trim()
        ? parseTimeInput(values.extended_close_time) ?? values.extended_close_time
        : undefined,
    };
  }

  return base;
}

export function getCalendarEntryTypeLabel(type: CalendarEntryType) {
  return CALENDAR_ENTRY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function sortCalendarEntries(entries: NurseryCalendarEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.entry_date !== right.entry_date) {
      return left.entry_date.localeCompare(right.entry_date);
    }

    const leftMinutes = left.start_time ? timeToMinutes(left.start_time) ?? 0 : 0;
    const rightMinutes = right.start_time ? timeToMinutes(right.start_time) ?? 0 : 0;
    return leftMinutes - rightMinutes;
  });
}

export function getEntriesForMonth(entries: NurseryCalendarEntry[], year: number, month: number) {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return sortCalendarEntries(
    entries.filter((entry) => entry.entry_date.startsWith(monthKey)),
  );
}

export function getEntriesForDate(entries: NurseryCalendarEntry[], date: string) {
  return sortCalendarEntries(entries.filter((entry) => entry.entry_date === date));
}

export function formatCalendarEntrySummary(entry: NurseryCalendarEntry) {
  if (entry.entry_type === "closure") {
    return entry.title;
  }

  if (entry.entry_type === "special_hours") {
    const range = entry.open_time && entry.close_time
      ? formatTimeRange(entry.open_time, entry.close_time)
      : "";
    return range ? `${entry.title}（${range}）` : entry.title;
  }

  if (entry.start_time) {
    return `${formatDisplayTime(entry.start_time)} ${entry.title}`;
  }

  return entry.title;
}

export function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


export function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

  for (let index = 0; index < startOffset; index += 1) {
    const date = new Date(year, month - 1, -startOffset + index + 1);
    cells.push({
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month - 1, day);
    cells.push({
      date: toDateKey(date),
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - (startOffset + totalDays) + 1;
    const date = new Date(year, month, nextIndex);
    cells.push({
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: false,
    });
  }

  return cells;
}

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type CalendarViewMode = "month" | "week" | "day";

export const CALENDAR_VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: "month", label: "月" },
  { value: "week", label: "週" },
  { value: "day", label: "日" },
];

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const next = new Date(`${dateKey}T12:00:00`);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function getWeekDateKeys(dateKey: string) {
  const anchor = parseDateKey(dateKey);
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + index);
    return toDateKey(d);
  });
}

export function getEntriesForWeek(entries: NurseryCalendarEntry[], dateKey: string) {
  const weekKeys = new Set(getWeekDateKeys(dateKey));
  return sortCalendarEntries(entries.filter((entry) => weekKeys.has(entry.entry_date)));
}

export function formatWeekRangeLabel(weekDateKeys: string[]) {
  const start = parseDateKey(weekDateKeys[0]!);
  const end = parseDateKey(weekDateKeys[6]!);
  const startText = start.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  const endText = end.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  if (start.getMonth() === end.getMonth()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日〜${end.getDate()}日`;
  }
  return `${start.getFullYear()}年${startText}〜${endText}`;
}

export function formatDayHeading(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function syncYearMonthFromDateKey(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  return { year: year ?? new Date().getFullYear(), month: month ?? 1 };
}

export function createClosedDayId() {
  return `rest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sortClosedDays(days: NurseryClosedDay[]) {
  return [...days].sort((a, b) => {
    const aKey = a.repeats_annually
      ? parseDateKey(a.date).getMonth() * 100 + parseDateKey(a.date).getDate()
      : parseDateKey(a.date).getTime();
    const bKey = b.repeats_annually
      ? parseDateKey(b.date).getMonth() * 100 + parseDateKey(b.date).getDate()
      : parseDateKey(b.date).getTime();
    return aKey - bKey;
  });
}

export function formatClosedDayDateLabel(entry: NurseryClosedDay) {
  const parsed = parseDateKey(entry.date);
  if (entry.repeats_annually) {
    return `${parsed.getMonth() + 1}月${parsed.getDate()}日（毎年）`;
  }
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function validateClosedDayInput(
  date: string,
  title: string,
  existing: NurseryClosedDay[],
  editingId?: string,
) {
  const errors: { date?: string; title?: string } = {};

  if (!date) {
    errors.date = "日付を選択してください。";
  } else if (
    existing.some((day) => day.id !== editingId && day.date === date)
  ) {
    errors.date = "この日付はすでに登録されています。";
  }

  if (!title.trim()) {
    errors.title = "タイトルを入力してください。";
  }

  return errors;
}
