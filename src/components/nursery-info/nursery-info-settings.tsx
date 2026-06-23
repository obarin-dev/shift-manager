"use client";

import { useMemo, useState } from "react";
import {
  buildCalendarEntryFromForm,
  buildMonthGrid,
  createCalendarEntryId,
  formatDateLabel,
  formatDisplayTime,
  getEntriesForDate,
  getEntriesForMonth,
  getEntriesForMonth as getMonthEntries,
  getEntriesForDate as getDayEntries,
  getCalendarEntryTypeLabel,
  INITIAL_NURSERY_CALENDAR_ENTRIES,
  INITIAL_NURSERY_PROFILE,
  INITIAL_SHIFT_TYPES,
  sortCalendarEntries,
  type CalendarEntryFormValues,
  type NurseryCalendarEntry,
  type NurseryProfile,
  type ShiftTypeDefinition,
  toDateKey,
  timeToMinutes,
  validateNurseryHours,
  validateCalendarEntryForm,
} from "@/lib/nursery-helpers";

import { CalendarEntryModal } from "@/components/nursery-info/calendar-entry-modal";
import { ShiftTypeFormModal } from "@/components/nursery-info/shift-type-form-modal";

type ShiftTypeModalState =
  | { type: "create"; draft: ShiftTypeDefinition }
  | { type: "edit"; shiftTypeId: string }
  | null;

type CalendarModalState =
  | { type: "create"; date: string }
  | { type: "edit"; entryId: string }
  | null;

function toTimeInputValue(time: string) {
  // mock uses "07:00" style; keep as-is
  return time;
}

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

export function NurseryInfoSettings() {
  const [profile, setProfile] = useState<NurseryProfile>(INITIAL_NURSERY_PROFILE);
  const [profileDraft, setProfileDraft] = useState<NurseryProfile>(
    INITIAL_NURSERY_PROFILE,
  );
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof NurseryProfile, string>>
  >({});

  const [shiftTypes, setShiftTypes] =
    useState<ShiftTypeDefinition[]>(INITIAL_SHIFT_TYPES);
  const sortedShiftTypes = useMemo(() => {
    return [...shiftTypes].sort((a, b) => a.sort_order - b.sort_order);
  }, [shiftTypes]);

  const [calendarEntries, setCalendarEntries] = useState<NurseryCalendarEntry[]>(
    INITIAL_NURSERY_CALENDAR_ENTRIES,
  );

  const now = useMemo(() => new Date(), []);
  const [visibleYear, setVisibleYear] = useState<number>(now.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState<number>(now.getMonth() + 1);

  const [shiftTypeModalState, setShiftTypeModalState] =
    useState<ShiftTypeModalState>(null);
  const [calendarModalState, setCalendarModalState] =
    useState<CalendarModalState>(null);

  const shiftTypeEditing =
    shiftTypeModalState?.type === "edit"
      ? shiftTypes.find((s) => s.id === shiftTypeModalState.shiftTypeId) ?? null
      : null;

  const shiftTypeDraft =
    shiftTypeModalState?.type === "create" ? shiftTypeModalState.draft : null;

  const currentShiftTypeForModal = shiftTypeEditing ?? shiftTypeDraft;

  const calendarModalEntry = useMemo(() => {
    if (calendarModalState?.type !== "edit") {
      return null;
    }
    return (
      calendarEntries.find((entry) => entry.id === calendarModalState.entryId) ??
      null
    );
  }, [calendarEntries, calendarModalState]);

  const entriesForMonth = useMemo(() => {
    return getEntriesForMonth(calendarEntries, visibleYear, visibleMonth);
  }, [calendarEntries, visibleYear, visibleMonth]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, NurseryCalendarEntry[]>();
    for (const entry of calendarEntries) {
      const list = map.get(entry.entry_date) ?? [];
      list.push(entry);
      map.set(entry.entry_date, list);
    }
    // keep it stable for rendering order
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        [...list].sort((left, right) => {
          if (left.entry_type !== right.entry_type) {
            return left.entry_type.localeCompare(right.entry_type);
          }
          const leftMinutes = left.start_time ? timeToMinutes(left.start_time) ?? 0 : 0;
          const rightMinutes = right.start_time ? timeToMinutes(right.start_time) ?? 0 : 0;
          return leftMinutes - rightMinutes;
        }),
      );
    }
    return map;
  }, [calendarEntries]);

  const monthGridCells = useMemo(() => {
    return buildMonthGrid(visibleYear, visibleMonth);
  }, [visibleYear, visibleMonth]);

  const selectedDaySummary = useMemo(() => {
    if (!calendarModalState || calendarModalState.type !== "create") {
      return null;
    }
    return entriesByDate.get(calendarModalState.date) ?? [];
  }, [calendarModalState, entriesByDate]);

  const handleProfileSave = () => {
    const nextErrors = validateNurseryHours(profileDraft);
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setProfile(profileDraft);
  };

  const openShiftTypeCreate = () => {
    const id = `shift-${Date.now()}`;
    const start = profile.open_time;
    const end = profile.close_time;

    setShiftTypeModalState({
      type: "create",
      draft: {
        id,
        code: "day",
        name: "新しい勤務区分",
        start,
        end,
        is_active: true,
        sort_order: Math.max(...shiftTypes.map((s) => s.sort_order), 0) + 1,
        color: "#E5E7EB",
      },
    });
  };

  const openShiftTypeEdit = (shiftTypeId: string) => {
    setShiftTypeModalState({ type: "edit", shiftTypeId });
  };

  const closeShiftTypeModal = () => setShiftTypeModalState(null);

  const handleShiftTypeModalSave = (values: {
    name: string;
    start: string;
    end: string;
    is_active: boolean;
  }) => {
    if (!currentShiftTypeForModal) {
      return;
    }

    const next = {
      ...currentShiftTypeForModal,
      name: values.name.trim(),
      start: values.start,
      end: values.end,
      is_active: values.is_active,
    };

    setShiftTypes((current) => {
      if (shiftTypeModalState?.type === "create") {
        return [...current, next];
      }
      if (shiftTypeModalState?.type === "edit") {
        return current.map((s) => (s.id === next.id ? next : s));
      }
      return current;
    });

    closeShiftTypeModal();
  };

  const openCalendarCreate = (date: string) => {
    setCalendarModalState({ type: "create", date });
  };

  const openCalendarEdit = (entryId: string) => {
    setCalendarModalState({ type: "edit", entryId });
  };

  const closeCalendarModal = () => setCalendarModalState(null);

  const handleCalendarSave = (nextEntry: NurseryCalendarEntry) => {
    setCalendarEntries((current) => {
      const index = current.findIndex((e) => e.id === nextEntry.id);
      if (index >= 0) {
        return current.map((e) => (e.id === nextEntry.id ? nextEntry : e));
      }
      return [...current, nextEntry];
    });
    closeCalendarModal();
  };

  const handleCalendarDelete = (entryId: string) => {
    setCalendarEntries((current) => current.filter((e) => e.id !== entryId));
    closeCalendarModal();
  };

  const calendarMonthLabel = new Date(
    `${visibleYear}-${String(visibleMonth).padStart(2, "0")}-01T12:00:00`,
  ).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const shiftTypeModalOpen = shiftTypeModalState !== null;
  const calendarModalOpen = calendarModalState !== null;

  return (
    <>
      <div className="nursery-info-layout">
        <div className="nursery-info-layout__left">
          {/* 園の基本情報 */}
          <details className="nursery-info-details" open>
            <summary className="nursery-info-details__summary">
              <span>園の基本情報</span>
            </summary>
            <section className="classes-panel" aria-label="園の基本情報">
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <p className="eyebrow" style={{ marginBottom: 12 }}>
                    園の基本情報
                  </p>
                  <div className="form-field-row">
                    <label className="form-field">
                      <span>園名</span>
                      <input
                        value={profileDraft.name}
                        onChange={(e) =>
                          setProfileDraft((cur) => ({
                            ...cur,
                            name: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>所在地</span>
                      <input
                        value={profileDraft.address}
                        onChange={(e) =>
                          setProfileDraft((cur) => ({
                            ...cur,
                            address: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="form-field-row">
                    <label className="form-field">
                      <span>電話番号</span>
                      <input
                        value={profileDraft.phone_number}
                        onChange={(e) =>
                          setProfileDraft((cur) => ({
                            ...cur,
                            phone_number: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </details>

          {/* 保育時間 */}
          <details className="nursery-info-details">
            <summary className="nursery-info-details__summary">
              <span>保育時間</span>
            </summary>
            <section className="classes-panel" aria-label="保育時間">
              <p className="eyebrow" style={{ margin: 0, marginBottom: 12 }}>
                保育時間（園が何時から何時まで開いているか）
              </p>

              <div className="form-field-row">
                <label className="form-field">
                  <span>開園時間</span>
                  <input
                    type="time"
                    aria-invalid={Boolean(profileErrors.open_time)}
                    value={toTimeInputValue(profileDraft.open_time)}
                    onChange={(e) =>
                      setProfileDraft((cur) => ({
                        ...cur,
                        open_time: e.target.value,
                      }))
                    }
                  />
                  {profileErrors.open_time ? <small>{profileErrors.open_time}</small> : null}
                </label>

                <label className="form-field">
                  <span>閉園時間</span>
                  <input
                    type="time"
                    aria-invalid={Boolean(profileErrors.close_time)}
                    value={toTimeInputValue(profileDraft.close_time)}
                    onChange={(e) =>
                      setProfileDraft((cur) => ({
                        ...cur,
                        close_time: e.target.value,
                      }))
                    }
                  />
                  {profileErrors.close_time ? <small>{profileErrors.close_time}</small> : null}
                </label>
              </div>

              <div className="form-field-row">
                <label className="form-field">
                  <span>延長保育の終了</span>
                  <input
                    type="time"
                    value={toTimeInputValue(profileDraft.extended_close_time)}
                    onChange={(e) =>
                      setProfileDraft((cur) => ({
                        ...cur,
                        extended_close_time: e.target.value,
                      }))
                    }
                  />
                  {profileErrors.extended_close_time ? (
                    <small>{profileErrors.extended_close_time}</small>
                  ) : null}
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleProfileSave}
                >
                  変更を保存
                </button>
              </div>
            </section>
          </details>

          {/* 勤務区分 */}
          <details className="nursery-info-details">
            <summary className="nursery-info-details__summary">
              <span>勤務区分マスタ</span>
            </summary>
            <section className="classes-panel" aria-label="勤務区分マスタ">
              <div className="classes-panel__toolbar">
                <p className="classes-panel__count">
                  勤務区分：{sortedShiftTypes.length}件
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={openShiftTypeCreate}
                >
                  区分を追加
                </button>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {sortedShiftTypes.map((shift) => (
                  <div
                    key={shift.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "center",
                      border: "1px solid rgba(217, 224, 234, 0.75)",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 800 }}>
                        {shift.name}（{shift.code}）
                      </p>
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "var(--muted)",
                          fontWeight: 700,
                        }}
                      >
                        {formatDisplayTime(shift.start)}- {formatDisplayTime(shift.end)}
                      </p>
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: shift.is_active ? "var(--primary)" : "var(--muted)",
                          fontWeight: 800,
                          fontSize: "0.9rem",
                        }}
                      >
                        {shift.is_active ? "有効" : "無効"}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        className="secondary-button secondary-button--compact"
                        type="button"
                        onClick={() => openShiftTypeEdit(shift.id)}
                      >
                        編集
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </details>
        </div>

        {/* カレンダー：常時表示（sticky） */}
        <div className="nursery-info-layout__right">
          <section
            className="classes-panel nursery-info-calendar-sticky"
            aria-label="園カレンダー"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <p className="eyebrow" style={{ margin: 0 }}>
                カレンダー（行事・休園・臨時の開園時間）
              </p>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="secondary-button secondary-button--compact"
                  type="button"
                  onClick={() => {
                    const d = new Date(
                      `${visibleYear}-${String(visibleMonth).padStart(
                        2,
                        "0",
                      )}-01T12:00:00`,
                    );
                    d.setMonth(d.getMonth() - 1);
                    setVisibleYear(d.getFullYear());
                    setVisibleMonth(d.getMonth() + 1);
                  }}
                >
                  前月
                </button>
                <p style={{ margin: 0, fontWeight: 900 }}>{calendarMonthLabel}</p>
                <button
                  className="secondary-button secondary-button--compact"
                  type="button"
                  onClick={() => {
                    const d = new Date(
                      `${visibleYear}-${String(visibleMonth).padStart(
                        2,
                        "0",
                      )}-01T12:00:00`,
                    );
                    d.setMonth(d.getMonth() + 1);
                    setVisibleYear(d.getFullYear());
                    setVisibleMonth(d.getMonth() + 1);
                  }}
                >
                  翌月
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
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
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 8,
                }}
              >
                {monthGridCells.map((cell) => {
                  const dayEntries = entriesByDate.get(cell.date) ?? [];

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => openCalendarCreate(cell.date)}
                      style={{
                        minHeight: 92,
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid var(--border)",
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
                        {dayEntries.length > 0 ? (
                          <span
                            style={{
                              color: "var(--primary)",
                              fontWeight: 900,
                              fontSize: "0.85rem",
                            }}
                          >
                            {dayEntries.length}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {dayEntries.slice(0, 4).map((entry) => {
                          const { bg } = getDotColors(entry);
                          return (
                            <span
                              key={entry.id}
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: bg,
                                display: "inline-block",
                              }}
                              aria-label={entry.title}
                            />
                          );
                        })}
                      </div>

                      {dayEntries.length > 0 ? (
                        <p
                          style={{
                            margin: 0,
                            color: "var(--muted)",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            lineHeight: 1.2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2 as any,
                            WebkitBoxOrient: "vertical" as any,
                          }}
                        >
                          {dayEntries
                            .slice(0, 2)
                            .map((e) =>
                              e.entry_type === "event" && e.start_time
                                ? `${formatDisplayTime(e.start_time)} ${e.title}`
                                : e.title,
                            )
                            .join(" / ")}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginTop: 18,
                  alignItems: "start",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 900, marginBottom: 10 }}>
                    凡例
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "var(--error)",
                        }}
                      />
                      <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                        休園
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(37, 99, 235, 0.65)",
                        }}
                      />
                      <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                        臨時の開園時間
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "var(--primary)",
                        }}
                      />
                      <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                        行事
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ margin: 0, fontWeight: 900, marginBottom: 10 }}>
                    当月の予定（編集）
                  </p>

                  {entriesForMonth.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted)", fontWeight: 800 }}>
                      まだ予定がありません。
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {entriesForMonth.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            border: "1px solid rgba(217, 224, 234, 0.75)",
                            borderRadius: 14,
                            padding: "12px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 900 }}>
                              {formatDateLabel(entry.entry_date)}
                            </p>
                            <p
                              style={{
                                margin: "6px 0 0",
                                color: "var(--muted)",
                                fontWeight: 800,
                              }}
                            >
                              {entry.entry_type === "event" && entry.start_time
                                ? `${formatDisplayTime(entry.start_time)} ${entry.title}`
                                : entry.title}
                            </p>
                          </div>

                          <button
                            className="secondary-button secondary-button--compact"
                            type="button"
                            onClick={() => openCalendarEdit(entry.id)}
                          >
                            編集
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 勤務区分モーダル */}
      {currentShiftTypeForModal ? (
        <ShiftTypeFormModal
          open={shiftTypeModalOpen}
          nurseryProfile={profile}
          shiftType={currentShiftTypeForModal}
          onClose={closeShiftTypeModal}
          onSave={handleShiftTypeModalSave}
        />
      ) : null}

      {/* カレンダー予定モーダル */}
      {calendarModalState?.type === "create" ? (
        <CalendarEntryModal
          open={calendarModalOpen}
          mode="create"
          defaultDate={calendarModalState.date}
          onClose={closeCalendarModal}
          onSave={handleCalendarSave}
        />
      ) : null}

      {calendarModalState?.type === "edit" && calendarModalEntry ? (
        <CalendarEntryModal
          open={calendarModalOpen}
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

