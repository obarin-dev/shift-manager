"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AUXILIARY_TIME_OPTIONS, parseTimeInput } from "@/lib/mock-classes";
import {
  buildCalendarEntryFromForm,
  calendarEntryToFormValues,
  emptyCalendarEntryFormValues,
  type CalendarEntryFormValues,
  type NurseryCalendarEntry,
  validateCalendarEntryForm,
} from "@/lib/mock-nursery-info";

type CalendarEntryModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialEntry?: NurseryCalendarEntry;
  defaultDate: string;
  onClose: () => void;
  onSave: (entry: NurseryCalendarEntry) => void;
  onDelete?: () => void;
};

export function CalendarEntryModal({
  open,
  mode,
  initialEntry,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: CalendarEntryModalProps) {
  const [values, setValues] = useState<CalendarEntryFormValues>(
    emptyCalendarEntryFormValues(defaultDate),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CalendarEntryFormValues, string>>>(
    {},
  );

  useEffect(() => {
    if (open) {
      setValues(
        initialEntry
          ? calendarEntryToFormValues(initialEntry)
          : emptyCalendarEntryFormValues(defaultDate),
      );
      setErrors({});
    }
  }, [defaultDate, initialEntry, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCalendarEntryForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(buildCalendarEntryFromForm(values, initialEntry?.id));
  };

  const normalizeTime = (field: keyof CalendarEntryFormValues, value: string) => {
    const parsed = parseTimeInput(value);
    if (parsed) {
      setValues((current) => ({ ...current, [field]: parsed }));
    }
  };

  const title = mode === "create" ? "予定を追加" : "予定を編集";
  const isClosure = values.entry_type === "closure";
  const isEvent = values.entry_type === "event";
  const isSpecialHours = values.entry_type === "special_hours";

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="calendar-entry-title"
        aria-modal="true"
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-panel__header">
          <h2 id="calendar-entry-title">{title}</h2>
          <button
            aria-label="閉じる"
            className="modal-panel__close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>日付</span>
            <input
              aria-invalid={Boolean(errors.entry_date)}
              onChange={(event) =>
                setValues((current) => ({ ...current, entry_date: event.target.value }))
              }
              type="date"
              value={values.entry_date}
            />
            {errors.entry_date ? <small>{errors.entry_date}</small> : null}
          </label>

          {!isClosure ? (
            <label className="form-field">
              <span>タイトル</span>
              <input
                aria-invalid={Boolean(errors.title)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="例: わくわく体育"
                value={values.title}
              />
              {errors.title ? <small>{errors.title}</small> : null}
            </label>
          ) : (
            <label className="form-field">
              <span>タイトル</span>
              <input
                aria-invalid={Boolean(errors.title)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="休園"
                value={values.title}
              />
              {errors.title ? <small>{errors.title}</small> : null}
            </label>
          )}

          {isEvent ? (
            <>
              <datalist id="calendar-event-time-options">
                {AUXILIARY_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div className="form-field-row">
                <label className="form-field-row__item">
                  <span className="form-field-row__sub-label">開始時刻</span>
                  <input
                    aria-invalid={Boolean(errors.start_time)}
                    list="calendar-event-time-options"
                    onBlur={(event) => normalizeTime("start_time", event.target.value)}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, start_time: event.target.value }))
                    }
                    placeholder="09:30"
                    value={values.start_time}
                  />
                  {errors.start_time ? <small>{errors.start_time}</small> : null}
                </label>
                <label className="form-field-row__item">
                  <span className="form-field-row__sub-label">終了時刻（任意）</span>
                  <input
                    aria-invalid={Boolean(errors.end_time)}
                    list="calendar-event-time-options"
                    onBlur={(event) => normalizeTime("end_time", event.target.value)}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, end_time: event.target.value }))
                    }
                    placeholder="10:30"
                    value={values.end_time}
                  />
                  {errors.end_time ? <small>{errors.end_time}</small> : null}
                </label>
              </div>
            </>
          ) : null}

          {isSpecialHours ? (
            <>
              <datalist id="calendar-hours-time-options">
                {AUXILIARY_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div className="form-field-row">
                <label className="form-field-row__item">
                  <span className="form-field-row__sub-label">開園</span>
                  <input
                    aria-invalid={Boolean(errors.open_time)}
                    list="calendar-hours-time-options"
                    onBlur={(event) => normalizeTime("open_time", event.target.value)}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, open_time: event.target.value }))
                    }
                    value={values.open_time}
                  />
                  {errors.open_time ? <small>{errors.open_time}</small> : null}
                </label>
                <label className="form-field-row__item">
                  <span className="form-field-row__sub-label">閉園</span>
                  <input
                    aria-invalid={Boolean(errors.close_time)}
                    list="calendar-hours-time-options"
                    onBlur={(event) => normalizeTime("close_time", event.target.value)}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, close_time: event.target.value }))
                    }
                    value={values.close_time}
                  />
                  {errors.close_time ? <small>{errors.close_time}</small> : null}
                </label>
              </div>
              <label className="form-field">
                <span>延長終了（任意）</span>
                <input
                  list="calendar-hours-time-options"
                  onBlur={(event) => normalizeTime("extended_close_time", event.target.value)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      extended_close_time: event.target.value,
                    }))
                  }
                  value={values.extended_close_time}
                />
              </label>
            </>
          ) : null}

          <label className="form-field">
            <span>メモ（任意）</span>
            <textarea
              onChange={(event) =>
                setValues((current) => ({ ...current, note: event.target.value }))
              }
              rows={3}
              value={values.note}
            />
          </label>

          <div className="modal-form__actions">
            {mode === "edit" && onDelete ? (
              <button className="danger-button" onClick={onDelete} type="button">
                削除
              </button>
            ) : null}
            <button className="secondary-button" onClick={onClose} type="button">
              キャンセル
            </button>
            <button className="primary-button" type="submit">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
