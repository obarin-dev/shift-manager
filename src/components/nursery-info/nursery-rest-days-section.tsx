"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionEditPencilButton } from "@/components/nursery-info/section-edit-pencil-button";
import {
  INITIAL_NURSERY_REST,
  PUBLIC_HOLIDAY_RULE_LABEL,
  WEEKDAY_LABELS,
  createClosedDayId,
  formatClosedDayDateLabel,
  sortClosedDays,
  validateClosedDayInput,
  type NurseryClosedDay,
  type NurseryRestSettings,
} from "@/lib/nursery-helpers";

function weeklyClosedLabel(days: number[], closeOnPublicHolidays: boolean) {
  const parts: string[] = days.map((day) => WEEKDAY_LABELS[day] ?? String(day));
  if (closeOnPublicHolidays) {
    parts.push(PUBLIC_HOLIDAY_RULE_LABEL);
  }

  if (parts.length === 0) {
    return "なし";
  }

  return parts.join("・");
}

type NurseryRestDaysSectionProps = {
  isEditing?: boolean;
  onIsEditingChange?: (editing: boolean) => void;
};

export function NurseryRestDaysSection({
  isEditing: isEditingProp,
  onIsEditingChange,
}: NurseryRestDaysSectionProps = {}) {
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const [settings, setSettings] = useState<NurseryRestSettings>(INITIAL_NURSERY_REST);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [weeklyDraft, setWeeklyDraft] = useState<number[]>(
    INITIAL_NURSERY_REST.weekly_closed_days,
  );
  const [closeOnPublicHolidaysDraft, setCloseOnPublicHolidaysDraft] = useState(
    INITIAL_NURSERY_REST.close_on_public_holidays,
  );
  const [closedDaysDraft, setClosedDaysDraft] = useState<NurseryClosedDay[]>(
    INITIAL_NURSERY_REST.closed_days,
  );

  const isControlled = onIsEditingChange !== undefined;
  const isEditing = isControlled ? Boolean(isEditingProp) : isEditingInternal;

  const setIsEditing = (editing: boolean) => {
    if (isControlled) {
      onIsEditingChange?.(editing);
    } else {
      setIsEditingInternal(editing);
    }
  };

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/nursery/holiday-settings");
      const body = (await response.json()) as { data?: NurseryRestSettings };

      if (response.ok && body.data) {
        setSettings(body.data);
      } else {
        setLoadError("休日設定の読み込みに失敗しました。");
      }
    } catch {
      setLoadError("休日設定の読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    setWeeklyDraft([...settings.weekly_closed_days]);
    setCloseOnPublicHolidaysDraft(settings.close_on_public_holidays);
    setClosedDaysDraft([...settings.closed_days]);
    setSaveError(null);
  }, [isEditing, settings]);

  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRepeatsAnnually, setNewRepeatsAnnually] = useState(false);
  const [addErrors, setAddErrors] = useState<Partial<Record<"date" | "title", string>>>(
    {},
  );

  const sortedClosedDays = useMemo(
    () => sortClosedDays(closedDaysDraft),
    [closedDaysDraft],
  );

  const savedSortedClosedDays = useMemo(
    () => sortClosedDays(settings.closed_days),
    [settings.closed_days],
  );

  const toggleWeekday = (dayIndex: number) => {
    setWeeklyDraft((current) => {
      if (current.includes(dayIndex)) {
        return current.filter((day) => day !== dayIndex);
      }
      return [...current, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleAddClosedDay = () => {
    const errors = validateClosedDayInput(newDate, newTitle, closedDaysDraft);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setClosedDaysDraft((current) => [
      ...current,
      {
        id: createClosedDayId(),
        date: newDate,
        title: newTitle.trim(),
        repeats_annually: newRepeatsAnnually,
      },
    ]);
    setNewDate("");
    setNewTitle("");
    setNewRepeatsAnnually(false);
    setAddErrors({});
  };

  const handleRemoveClosedDay = (id: string) => {
    setClosedDaysDraft((current) => current.filter((day) => day.id !== id));
  };

  const cancelEdit = () => {
    setWeeklyDraft([...settings.weekly_closed_days]);
    setCloseOnPublicHolidaysDraft(settings.close_on_public_holidays);
    setClosedDaysDraft([...settings.closed_days]);
    setNewDate("");
    setNewTitle("");
    setNewRepeatsAnnually(false);
    setAddErrors({});
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const payload: NurseryRestSettings = {
      weekly_closed_days: weeklyDraft,
      close_on_public_holidays: closeOnPublicHolidaysDraft,
      closed_days: closedDaysDraft,
    };

    try {
      const response = await fetch("/api/nursery/holiday-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { data?: NurseryRestSettings };

      if (!response.ok || !body.data) {
        setSaveError("保存に失敗しました。");
        return;
      }

      setSettings(body.data);
      setIsEditing(false);
      window.alert("休日設定を保存しました。");
    } catch {
      setSaveError("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const weeklyDraftLabel = weeklyClosedLabel(weeklyDraft, closeOnPublicHolidaysDraft);

  if (isLoading) {
    return (
      <section className="classes-panel" aria-label="休日設定">
        <p className="classes-panel__count">読み込み中…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="classes-panel" aria-label="休日設定">
        <p style={{ color: "var(--danger)" }}>{loadError}</p>
      </section>
    );
  }

  return (
    <section className="classes-panel" aria-label="休日設定">
      {!isEditing ? (
        <div className="nursery-info-details__toolbar">
          <SectionEditPencilButton onClick={() => setIsEditing(true)} />
        </div>
      ) : null}

      <p style={{ margin: "0 0 16px", color: "var(--muted)", fontWeight: 600 }}>
        休園日の設定を行います。
      </p>

      {!isEditing ? (
        <>
          <div className="nursery-info-readonly-grid" style={{ marginBottom: 16 }}>
            <div className="nursery-info-readonly-grid__row">
              <p className="nursery-info-readonly-grid__label">定休・祝日</p>
              <p className="nursery-info-readonly-grid__value">
                {weeklyClosedLabel(
                  settings.weekly_closed_days,
                  settings.close_on_public_holidays,
                )}
              </p>
            </div>
            <div className="nursery-info-readonly-grid__row">
              <p className="nursery-info-readonly-grid__label">その他の休み</p>
              <p className="nursery-info-readonly-grid__value">
                {settings.closed_days.length}件
              </p>
            </div>
          </div>

          {savedSortedClosedDays.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              臨時休園など個別の休みは登録されていません。
            </p>
          ) : (
            <ul className="nursery-closed-days-list">
              {savedSortedClosedDays.map((entry) => (
                <li key={entry.id} className="nursery-closed-days-list__item">
                  <div>
                    <p className="nursery-closed-days-list__date">
                      {formatClosedDayDateLabel(entry)}
                    </p>
                    <p className="nursery-closed-days-list__title">{entry.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 800 }}>定休日（毎週）</p>
            <div
              className="nursery-weekday-toggle"
              role="group"
              aria-label="定休日と祝日のルール"
            >
              {WEEKDAY_LABELS.map((label, dayIndex) => {
                const active = weeklyDraft.includes(dayIndex);
                return (
                  <button
                    key={label}
                    type="button"
                    className={
                      active
                        ? "nursery-weekday-toggle__btn is-active"
                        : "nursery-weekday-toggle__btn"
                    }
                    aria-pressed={active}
                    onClick={() => toggleWeekday(dayIndex)}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                className={
                  closeOnPublicHolidaysDraft
                    ? "nursery-weekday-toggle__btn nursery-weekday-toggle__btn--holiday is-active"
                    : "nursery-weekday-toggle__btn nursery-weekday-toggle__btn--holiday"
                }
                aria-pressed={closeOnPublicHolidaysDraft}
                onClick={() => setCloseOnPublicHolidaysDraft((current) => !current)}
              >
                {PUBLIC_HOLIDAY_RULE_LABEL}
              </button>
            </div>
            <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              選択中: {weeklyDraftLabel}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 800 }}>
              その他の休み（臨時休園・創立記念日など）
            </p>

            {sortedClosedDays.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                登録された休みはありません。
              </p>
            ) : (
              <ul className="nursery-closed-days-list">
                {sortedClosedDays.map((entry) => (
                  <li key={entry.id} className="nursery-closed-days-list__item">
                    <div>
                      <p className="nursery-closed-days-list__date">
                        {formatClosedDayDateLabel(entry)}
                      </p>
                      <p className="nursery-closed-days-list__title">{entry.title}</p>
                    </div>
                    <button
                      className="secondary-button secondary-button--compact"
                      type="button"
                      onClick={() => handleRemoveClosedDay(entry.id)}
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="nursery-closed-days-form" aria-label="休みの日を追加">
            <p style={{ margin: "0 0 12px", fontWeight: 800 }}>1件ずつ追加</p>
            <div className="form-field-row">
              <label className="form-field">
                <span>日付</span>
                <input
                  type="date"
                  aria-invalid={Boolean(addErrors.date)}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                {addErrors.date ? <small>{addErrors.date}</small> : null}
              </label>
              <label className="form-field">
                <span>名称</span>
                <input
                  type="text"
                  placeholder="例: 創立記念日"
                  aria-invalid={Boolean(addErrors.title)}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                {addErrors.title ? <small>{addErrors.title}</small> : null}
              </label>
            </div>
            <label className="form-field form-field--checkbox" style={{ marginTop: 4 }}>
              <input
                type="checkbox"
                checked={newRepeatsAnnually}
                onChange={(e) => setNewRepeatsAnnually(e.target.checked)}
              />
              <span>毎年同じ月日を休園とする</span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="secondary-button"
                type="button"
                onClick={handleAddClosedDay}
              >
                リストに追加
              </button>
            </div>
          </div>

          {saveError ? (
            <p style={{ color: "var(--danger)", marginBottom: 8 }}>{saveError}</p>
          ) : null}

          <div
            className="nursery-section-form__actions"
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(217, 224, 234, 0.75)",
            }}
          >
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              disabled={isSaving}
              onClick={cancelEdit}
            >
              キャンセル
            </button>
            <button
              className="primary-button primary-button--compact"
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? "保存中…" : "変更を保存"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
