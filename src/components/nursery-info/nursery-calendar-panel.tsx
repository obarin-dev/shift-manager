"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDaysToDateKey,
  buildMonthGrid,
  CALENDAR_VIEW_OPTIONS,
  formatCalendarEntrySummary,
  formatDayHeading,
  formatDisplayTime,
  formatWeekRangeLabel,
  getCalendarEntryTypeLabel,
  getEntriesForDate,
  getWeekDateKeys,
  parseDateKey,
  syncYearMonthFromDateKey,
  toDateKey,
  type CalendarViewMode,
  type NurseryCalendarEntry,
  timeToMinutes,
  WEEKDAY_LABELS,
} from "@/lib/nursery-helpers";
import { CalendarEntryModal } from "@/components/nursery-info/calendar-entry-modal";
import { useHolidaySettings } from "@/hooks/use-holiday-settings";
import {
  getClosedDayForDate,
  getPublicHolidayForDate,
  isClosedDate,
} from "@/lib/holiday-settings";

type CalendarModalState =
  | { type: "create"; date: string }
  | { type: "edit"; entryId: string }
  | null;

function getDotColors(entry: NurseryCalendarEntry) {
  switch (entry.entry_type) {
    case "closure":
      return { bg: "var(--error)" };
    case "special_hours":
      return { bg: "rgba(37, 99, 235, 0.65)" };
    case "event":
      return { bg: "var(--primary)" };
  }
}

function getCalendarFetchRange(
  viewMode: CalendarViewMode,
  visibleYear: number,
  visibleMonth: number,
  focusDate: string,
): { from: string; to: string } {
  if (viewMode === "week") {
    const weekKeys = getWeekDateKeys(focusDate);
    return { from: weekKeys[0]!, to: weekKeys[6]! };
  }

  const grid = buildMonthGrid(visibleYear, visibleMonth);
  const first = grid[0]?.date;
  const last = grid[grid.length - 1]?.date;
  if (!first || !last) {
    return { from: focusDate, to: focusDate };
  }

  return { from: first, to: last };
}

function sortEntriesByDateAndTime(entries: NurseryCalendarEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.entry_date !== right.entry_date) {
      return left.entry_date.localeCompare(right.entry_date);
    }
    if (left.entry_type !== right.entry_type) {
      return left.entry_type.localeCompare(right.entry_type);
    }
    const leftMinutes = left.start_time ? timeToMinutes(left.start_time) ?? 0 : 0;
    const rightMinutes = right.start_time ? timeToMinutes(right.start_time) ?? 0 : 0;
    return leftMinutes - rightMinutes;
  });
}

export function NurseryCalendarPanel({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [calendarEntries, setCalendarEntries] = useState<NurseryCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [focusDate, setFocusDate] = useState<string>(() => toDateKey(now));
  const [visibleYear, setVisibleYear] = useState<number>(now.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState<number>(now.getMonth() + 1);

  const [calendarModalState, setCalendarModalState] =
    useState<CalendarModalState>(null);
  const { settings: holidaySettings } = useHolidaySettings();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchRange = useMemo(
    () => getCalendarFetchRange(viewMode, visibleYear, visibleMonth, focusDate),
    [viewMode, visibleYear, visibleMonth, focusDate],
  );

  const loadCalendarEntries = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }
    setLoadError(null);

    const params = new URLSearchParams({
      from: fetchRange.from,
      to: fetchRange.to,
    });

    try {
      const response = await fetch(`/api/calendar-entries?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as { data?: NurseryCalendarEntry[] };
      if (!response.ok || !body.data) {
        throw new Error("load_failed");
      }
      setCalendarEntries(body.data);
    } catch {
      setLoadError("カレンダーの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [fetchRange.from, fetchRange.to, hasLoadedOnce]);

  useEffect(() => {
    void loadCalendarEntries();
  }, [fetchRange.from, fetchRange.to, loadCalendarEntries]);

  const calendarModalEntry = useMemo(() => {
    if (calendarModalState?.type !== "edit") return null;
    return calendarEntries.find((entry) => entry.id === calendarModalState.entryId) ?? null;
  }, [calendarEntries, calendarModalState]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, NurseryCalendarEntry[]>();
    for (const entry of calendarEntries) {
      const list = map.get(entry.entry_date) ?? [];
      list.push(entry);
      map.set(entry.entry_date, list);
    }

    for (const [key, list] of map.entries()) {
      map.set(key, sortEntriesByDateAndTime(list));
    }
    return map;
  }, [calendarEntries]);

  const monthGridCells = useMemo(() => {
    return buildMonthGrid(visibleYear, visibleMonth);
  }, [visibleYear, visibleMonth]);

  const weekDateKeys = useMemo(() => getWeekDateKeys(focusDate), [focusDate]);

  const entriesForDay = useMemo(() => {
    return getEntriesForDate(calendarEntries, focusDate);
  }, [calendarEntries, focusDate]);
  const isFocusDateClosed = useMemo(
    () => isClosedDate(focusDate, holidaySettings),
    [focusDate, holidaySettings],
  );
  const focusClosedDay = useMemo(
    () => getClosedDayForDate(focusDate, holidaySettings),
    [focusDate, holidaySettings],
  );
  const focusPublicHoliday = useMemo(
    () => getPublicHolidayForDate(focusDate, holidaySettings),
    [focusDate, holidaySettings],
  );

  const calendarMonthLabel = new Date(
    `${visibleYear}-${String(visibleMonth).padStart(2, "0")}-01T12:00:00`,
  ).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const syncVisibleMonthFromFocus = (dateKey: string) => {
    const { year, month } = syncYearMonthFromDateKey(dateKey);
    setVisibleYear(year);
    setVisibleMonth(month);
  };

  const handleViewModeChange = (nextMode: CalendarViewMode) => {
    setViewMode(nextMode);
    syncVisibleMonthFromFocus(focusDate);
  };

  const goToDayView = (dateKey: string) => {
    setFocusDate(dateKey);
    syncVisibleMonthFromFocus(dateKey);
    setViewMode("day");
  };

  const shiftFocusDate = (days: number) => {
    const nextDate = addDaysToDateKey(focusDate, days);
    setFocusDate(nextDate);
    syncVisibleMonthFromFocus(nextDate);
  };

  const shiftVisibleMonth = (delta: number) => {
    const anchor = new Date(
      `${visibleYear}-${String(visibleMonth).padStart(2, "0")}-01T12:00:00`,
    );
    anchor.setMonth(anchor.getMonth() + delta);
    setVisibleYear(anchor.getFullYear());
    setVisibleMonth(anchor.getMonth() + 1);
    setFocusDate(
      toDateKey(
        new Date(anchor.getFullYear(), anchor.getMonth(), parseDateKey(focusDate).getDate()),
      ),
    );
  };

  const openCalendarCreate = (date: string) => {
    setCalendarModalState({ type: "create", date });
  };

  const openCalendarEdit = (entryId: string) => {
    setCalendarModalState({ type: "edit", entryId });
  };

  const closeCalendarModal = () => setCalendarModalState(null);

  const handleCalendarSave = async (nextEntry: NurseryCalendarEntry) => {
    setSaveError(null);
    try {
      const isEdit = calendarModalState?.type === "edit";
      const response = await fetch(
        isEdit ? `/api/calendar-entries/${nextEntry.id}` : "/api/calendar-entries",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextEntry),
        },
      );
      const body = (await response.json()) as { data?: NurseryCalendarEntry };
      if (!response.ok || !body.data) {
        throw new Error("save_failed");
      }

      setCalendarEntries((current) => {
        if (isEdit) {
          return current.map((entry) => (entry.id === body.data!.id ? body.data! : entry));
        }
        return [...current, body.data!];
      });
      closeCalendarModal();
    } catch {
      setSaveError("保存に失敗しました。");
    }
  };

  const handleCalendarDelete = async (entryId: string) => {
    setSaveError(null);
    try {
      const response = await fetch(`/api/calendar-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      setCalendarEntries((current) => current.filter((entry) => entry.id !== entryId));
      closeCalendarModal();
    } catch {
      setSaveError("削除に失敗しました。");
    }
  };

  const navConfig = useMemo(() => {
    if (viewMode === "week") {
      return {
        prevLabel: "前週",
        nextLabel: "翌週",
        title: formatWeekRangeLabel(weekDateKeys),
        onPrev: () => shiftFocusDate(-7),
        onNext: () => shiftFocusDate(7),
      };
    }
    if (viewMode === "day") {
      return {
        prevLabel: "前日",
        nextLabel: "翌日",
        title: formatDayHeading(focusDate),
        onPrev: () => shiftFocusDate(-1),
        onNext: () => shiftFocusDate(1),
      };
    }
    return {
      prevLabel: "前月",
      nextLabel: "翌月",
      title: calendarMonthLabel,
      onPrev: () => shiftVisibleMonth(-1),
      onNext: () => shiftVisibleMonth(1),
    };
  }, [viewMode, weekDateKeys, focusDate, calendarMonthLabel]);

  return (
    <>
      <section className="classes-panel" aria-label="園カレンダー">
        {isLoading ? <p className="classes-panel__count">読み込み中…</p> : null}
        {loadError ? <p style={{ color: "var(--danger)" }}>{loadError}</p> : null}
        {saveError ? <p style={{ color: "var(--danger)" }}>{saveError}</p> : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <p className="eyebrow" style={{ margin: 0 }}>
            カレンダー（行事・休園・臨時の開園時間）
          </p>

          <div
            className="classes-management-nav"
            role="tablist"
            aria-label="表示切替"
            style={{ marginBottom: 0 }}
          >
            {CALENDAR_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={viewMode === option.value}
                className={
                  viewMode === option.value
                    ? "classes-management-nav__item is-active"
                    : "classes-management-nav__item"
                }
                onClick={() => handleViewModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            alignItems: "center",
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          <button
            className="secondary-button secondary-button--compact"
            type="button"
            onClick={navConfig.onPrev}
          >
            {navConfig.prevLabel}
          </button>
          <p style={{ margin: 0, fontWeight: 900, minWidth: 0, textAlign: "center" }}>
            {navConfig.title}
          </p>
          <button
            className="secondary-button secondary-button--compact"
            type="button"
            onClick={navConfig.onNext}
          >
            {navConfig.nextLabel}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {viewMode === "month" ? (
            <>
              <div className="nursery-calendar-grid-wrap">
                <div
                  className="nursery-calendar-grid-header"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      style={{
                        color: "var(--muted)",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        textAlign: "center",
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div
                  className="nursery-calendar-grid-body"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 8,
                  }}
                >
                  {monthGridCells.map((cell) => {
                  const dayEntries = entriesByDate.get(cell.date) ?? [];
                  const isFocused = cell.date === focusDate;
                  const isClosed = isClosedDate(cell.date, holidaySettings);
                  const closedDay = getClosedDayForDate(cell.date, holidaySettings);
                  const publicHoliday = getPublicHolidayForDate(cell.date, holidaySettings);
                  const totalCount = dayEntries.length + (isClosed ? 1 : 0);
                  const monthMaxLines = 3;
                  const monthDisplayLines = (() => {
                    const lines: string[] = [];

                    if (isClosed) {
                      lines.push(
                        closedDay?.title
                          ? `休園: ${closedDay.title}`
                          : publicHoliday?.title
                            ? `休園: ${publicHoliday.title}`
                            : "休園",
                      );
                    }

                    const entryLines = dayEntries.map((entry) =>
                      entry.entry_type === "event" && entry.start_time
                        ? `${formatDisplayTime(entry.start_time)} ${entry.title}`
                        : entry.title,
                    );

                    const remaining = monthMaxLines - lines.length;
                    const showCount = Math.max(0, remaining);
                    const shownEntries = entryLines.slice(0, showCount);
                    lines.push(...shownEntries);

                    if (entryLines.length > shownEntries.length) {
                      if (lines.length < monthMaxLines) {
                        lines.push("・・・");
                      } else if (lines.length === monthMaxLines) {
                        lines[monthMaxLines - 1] = "・・・";
                      }
                    }

                    return lines.slice(0, monthMaxLines);
                  })();

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => goToDayView(cell.date)}
                      style={{
                        minHeight: 92,
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 16,
                        border: isFocused
                          ? "2px solid var(--primary)"
                          : "1px solid var(--border)",
                        background: cell.inMonth
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.65)",
                        opacity: cell.inMonth ? 1 : 0.72,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontWeight: 900, color: "var(--text)" }}>
                          {cell.day}
                        </span>
                        {totalCount > 0 ? (
                          <span
                            style={{
                              color: "var(--primary)",
                              fontWeight: 900,
                              fontSize: "0.85rem",
                            }}
                          >
                            {totalCount}
                          </span>
                        ) : null}
                      </div>

                      {totalCount > 0 ? (
                        <div
                          style={{
                            margin: 0,
                            color: "var(--muted)",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            lineHeight: 1.25,
                            overflow: "hidden",
                            display: "grid",
                            gap: 2,
                          }}
                        >
                          {monthDisplayLines.map((line, index) => (
                            <span
                              key={`${cell.date}-line-${index}`}
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {viewMode === "week" ? (
            <>
              <div className="nursery-calendar-grid-wrap">
                <div
                  className="nursery-calendar-grid-header"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {weekDateKeys.map((dateKey) => {
                  const parsed = new Date(`${dateKey}T12:00:00`);
                  const weekday = WEEKDAY_LABELS[parsed.getDay()];
                  return (
                    <div
                      key={dateKey}
                      style={{
                        color: "var(--muted)",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        textAlign: "center",
                      }}
                    >
                      {weekday}
                    </div>
                  );
                  })}
                </div>

                <div
                  className="nursery-calendar-grid-body"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 8,
                  }}
                >
                  {weekDateKeys.map((dateKey) => {
                  const dayEntries = entriesByDate.get(dateKey) ?? [];
                  const parsed = new Date(`${dateKey}T12:00:00`);
                  const isFocused = dateKey === focusDate;
                  const isClosed = isClosedDate(dateKey, holidaySettings);
                  const closedDay = getClosedDayForDate(dateKey, holidaySettings);
                  const publicHoliday = getPublicHolidayForDate(dateKey, holidaySettings);

                  return (
                    <div
                      key={dateKey}
                      style={{
                        minHeight: 180,
                        borderRadius: 16,
                        border: isFocused
                          ? "2px solid var(--primary)"
                          : "1px solid var(--border)",
                        background: "rgba(255,255,255,0.95)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => goToDayView(dateKey)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: "10px 10px 6px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        {parsed.getDate()}日
                        {isClosed ? " ・休園" : ""}
                      </button>

                      <div
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "0 8px 8px",
                          flex: 1,
                          alignContent: "start",
                        }}
                      >
                        {isClosed ? (
                          <div
                            style={{
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              borderRadius: 10,
                              padding: "6px 8px",
                              background: "rgba(239, 68, 68, 0.08)",
                              fontSize: "0.8rem",
                              fontWeight: 800,
                              color: "var(--error)",
                            }}
                          >
                            休園{closedDay?.title ? `: ${closedDay.title}` : ""}
                            {!closedDay && publicHoliday ? `: ${publicHoliday.title}` : ""}
                          </div>
                        ) : null}
                        {dayEntries.map((entry) => {
                          const { bg } = getDotColors(entry);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={readOnly ? undefined : () => openCalendarEdit(entry.id)}
                              style={{
                                border: "1px solid rgba(217, 224, 234, 0.75)",
                                borderRadius: 10,
                                padding: "6px 8px",
                                background: "#fff",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                gap: 6,
                                alignItems: "flex-start",
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 999,
                                  background: bg,
                                  marginTop: 5,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 800,
                                  color: "var(--text)",
                                  lineHeight: 1.3,
                                }}
                              >
                                {formatCalendarEntrySummary(entry)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {viewMode === "day" ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.95)",
              }}
            >
              {!readOnly ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 14,
                  }}
                >
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => openCalendarCreate(focusDate)}
                  >
                    予定を追加
                  </button>
                </div>
              ) : null}

              {entriesForDay.length === 0 && !isFocusDateClosed ? (
                <p style={{ margin: 0, color: "var(--muted)", fontWeight: 800 }}>
                  この日の予定はありません。上のボタンから追加できます。
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {isFocusDateClosed ? (
                    <div
                      style={{
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 14,
                        padding: "14px 16px",
                        background: "rgba(239, 68, 68, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 900, color: "var(--error)" }}>
                          休園
                        </p>
                        <p style={{ margin: "6px 0 0", fontWeight: 800 }}>
                          {focusClosedDay?.title ??
                            focusPublicHoliday?.title ??
                            "休日設定で休園日として登録"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {entriesForDay.map((entry) => {
                    const { bg } = getDotColors(entry);
                    return (
                      <div
                        key={entry.id}
                        style={{
                          border: "1px solid rgba(217, 224, 234, 0.75)",
                          borderRadius: 14,
                          padding: "14px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: bg,
                              marginTop: 6,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <p style={{ margin: 0, fontWeight: 900, color: "var(--primary)" }}>
                              {getCalendarEntryTypeLabel(entry.entry_type)}
                            </p>
                            <p style={{ margin: "6px 0 0", fontWeight: 800 }}>
                              {formatCalendarEntrySummary(entry)}
                            </p>
                            {entry.note ? (
                              <p
                                style={{
                                  margin: "8px 0 0",
                                  color: "var(--muted)",
                                  fontWeight: 700,
                                }}
                              >
                                {entry.note}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {!readOnly ? (
                          <button
                            className="secondary-button secondary-button--compact"
                            type="button"
                            onClick={() => openCalendarEdit(entry.id)}
                          >
                            編集
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {calendarModalState?.type === "create" ? (
        <CalendarEntryModal
          open={true}
          mode="create"
          defaultDate={calendarModalState.date}
          onClose={closeCalendarModal}
          onSave={handleCalendarSave}
        />
      ) : null}

      {calendarModalState?.type === "edit" && calendarModalEntry ? (
        <CalendarEntryModal
          open={true}
          mode="edit"
          initialEntry={calendarModalEntry}
          defaultDate={calendarModalEntry.entry_date}
          onClose={closeCalendarModal}
          onSave={handleCalendarSave}
          onDelete={() => handleCalendarDelete(calendarModalEntry.id)}
        />
      ) : null}
    </>
  );
}
