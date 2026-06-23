/** 国民の祝日（年ごとの日付。振替休日・国民の休日を含む） */
export type JapanesePublicHoliday = {
  date: string;
  title: string;
  /** 毎年同じ月日の祝日（元日など）。移動祝日は false */
  repeats_annually: boolean;
};

const HOLIDAYS_BY_YEAR: Record<number, JapanesePublicHoliday[]> = {
  2025: [
    { date: "2025-01-01", title: "元日", repeats_annually: true },
    { date: "2025-01-13", title: "成人の日", repeats_annually: false },
    { date: "2025-02-11", title: "建国記念の日", repeats_annually: true },
    { date: "2025-02-23", title: "天皇誕生日", repeats_annually: true },
    { date: "2025-02-24", title: "振替休日", repeats_annually: false },
    { date: "2025-03-20", title: "春分の日", repeats_annually: false },
    { date: "2025-04-29", title: "昭和の日", repeats_annually: true },
    { date: "2025-05-03", title: "憲法記念日", repeats_annually: true },
    { date: "2025-05-04", title: "みどりの日", repeats_annually: true },
    { date: "2025-05-05", title: "こどもの日", repeats_annually: true },
    { date: "2025-05-06", title: "振替休日", repeats_annually: false },
    { date: "2025-07-21", title: "海の日", repeats_annually: false },
    { date: "2025-08-11", title: "山の日", repeats_annually: true },
    { date: "2025-09-15", title: "敬老の日", repeats_annually: false },
    { date: "2025-09-23", title: "秋分の日", repeats_annually: false },
    { date: "2025-10-13", title: "スポーツの日", repeats_annually: false },
    { date: "2025-11-03", title: "文化の日", repeats_annually: true },
    { date: "2025-11-23", title: "勤労感謝の日", repeats_annually: true },
    { date: "2025-11-24", title: "振替休日", repeats_annually: false },
  ],
  2026: [
    { date: "2026-01-01", title: "元日", repeats_annually: true },
    { date: "2026-01-12", title: "成人の日", repeats_annually: false },
    { date: "2026-02-11", title: "建国記念の日", repeats_annually: true },
    { date: "2026-02-23", title: "天皇誕生日", repeats_annually: true },
    { date: "2026-03-20", title: "春分の日", repeats_annually: false },
    { date: "2026-04-29", title: "昭和の日", repeats_annually: true },
    { date: "2026-05-03", title: "憲法記念日", repeats_annually: true },
    { date: "2026-05-04", title: "みどりの日", repeats_annually: true },
    { date: "2026-05-05", title: "こどもの日", repeats_annually: true },
    { date: "2026-05-06", title: "振替休日", repeats_annually: false },
    { date: "2026-07-20", title: "海の日", repeats_annually: false },
    { date: "2026-08-11", title: "山の日", repeats_annually: true },
    { date: "2026-09-21", title: "敬老の日", repeats_annually: false },
    { date: "2026-09-22", title: "国民の休日", repeats_annually: false },
    { date: "2026-09-23", title: "秋分の日", repeats_annually: false },
    { date: "2026-10-12", title: "スポーツの日", repeats_annually: false },
    { date: "2026-11-03", title: "文化の日", repeats_annually: true },
    { date: "2026-11-23", title: "勤労感謝の日", repeats_annually: true },
  ],
  2027: [
    { date: "2027-01-01", title: "元日", repeats_annually: true },
    { date: "2027-01-11", title: "成人の日", repeats_annually: false },
    { date: "2027-02-11", title: "建国記念の日", repeats_annually: true },
    { date: "2027-02-23", title: "天皇誕生日", repeats_annually: true },
    { date: "2027-03-21", title: "春分の日", repeats_annually: false },
    { date: "2027-04-29", title: "昭和の日", repeats_annually: true },
    { date: "2027-05-03", title: "憲法記念日", repeats_annually: true },
    { date: "2027-05-04", title: "みどりの日", repeats_annually: true },
    { date: "2027-05-05", title: "こどもの日", repeats_annually: true },
    { date: "2027-07-19", title: "海の日", repeats_annually: false },
    { date: "2027-08-11", title: "山の日", repeats_annually: true },
    { date: "2027-09-20", title: "敬老の日", repeats_annually: false },
    { date: "2027-09-23", title: "秋分の日", repeats_annually: false },
    { date: "2027-10-11", title: "スポーツの日", repeats_annually: false },
    { date: "2027-11-03", title: "文化の日", repeats_annually: true },
    { date: "2027-11-23", title: "勤労感謝の日", repeats_annually: true },
  ],
};

export const PUBLIC_HOLIDAY_YEARS = Object.keys(HOLIDAYS_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b);

export function getJapanesePublicHolidays(year: number): JapanesePublicHoliday[] {
  return HOLIDAYS_BY_YEAR[year] ?? [];
}

export function isJapanesePublicHolidayDate(dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(year)) {
    return false;
  }

  return getJapanesePublicHolidays(year).some((holiday) => holiday.date === dateKey);
}

export function holidayEntryKey(holiday: Pick<JapanesePublicHoliday, "date" | "title">) {
  return `${holiday.date}:${holiday.title}`;
}

/** 既存の休みの日と重複するか（日付＋名称、または毎年同じ月日） */
export function isHolidayAlreadyRegistered(
  holiday: JapanesePublicHoliday,
  closedDays: Array<{ date: string; title: string; repeats_annually: boolean }>,
): boolean {
  const [y, m, d] = holiday.date.split("-").map(Number);

  return closedDays.some((entry) => {
    if (entry.title !== holiday.title) {
      return false;
    }

    if (holiday.repeats_annually && entry.repeats_annually) {
      const [, em, ed] = entry.date.split("-").map(Number);
      return m === em && d === ed;
    }

    return entry.date === holiday.date;
  });
}
