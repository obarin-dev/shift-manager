"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AUXILIARY_TIME_OPTIONS, parseTimeInput } from "@/lib/mock-classes";
import {
  type NurseryProfile,
  type ShiftTypeDefinition,
  validateShiftTypeTimes,
} from "@/lib/mock-nursery-info";

type ShiftTypeFormValues = {
  name: string;
  start: string;
  end: string;
  is_active: boolean;
};

type ShiftTypeFormModalProps = {
  open: boolean;
  shiftType: ShiftTypeDefinition;
  nurseryProfile: NurseryProfile;
  saveError?: string | null;
  onClose: () => void;
  onSave: (values: ShiftTypeFormValues) => void;
};

export function ShiftTypeFormModal({
  open,
  shiftType,
  nurseryProfile,
  saveError,
  onClose,
  onSave,
}: ShiftTypeFormModalProps) {
  const [values, setValues] = useState<ShiftTypeFormValues>({
    name: shiftType.name,
    start: shiftType.start,
    end: shiftType.end,
    is_active: shiftType.is_active,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftTypeFormValues, string>>>({});

  useEffect(() => {
    if (open) {
      setValues({
        name: shiftType.name,
        start: shiftType.start,
        end: shiftType.end,
        is_active: shiftType.is_active,
      });
      setErrors({});
    }
  }, [open, shiftType]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ShiftTypeFormValues, string>> = {};

    if (!values.name.trim()) {
      nextErrors.name = "区分名を入力してください。";
    }

    const timeErrors = validateShiftTypeTimes(
      { ...shiftType, start: values.start, end: values.end },
      nurseryProfile,
    );

    Object.assign(nextErrors, timeErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      ...values,
      name: values.name.trim(),
      start: parseTimeInput(values.start) ?? values.start,
      end: parseTimeInput(values.end) ?? values.end,
    });
  };

  const normalizeTime = (field: "start" | "end", value: string) => {
    const parsed = parseTimeInput(value);
    if (parsed) {
      setValues((current) => ({ ...current, [field]: parsed }));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="shift-type-form-title"
        aria-modal="true"
        className="modal-panel modal-panel--compact"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-panel__header">
          <h2 id="shift-type-form-title">勤務区分を編集</h2>
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
          <p className="modal-panel__message">
            {shiftType.name}（{shiftType.code}）
          </p>

          <label className="form-field">
            <span>区分名</span>
            <input
              aria-invalid={Boolean(errors.name)}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              value={values.name}
            />
            {errors.name ? <small>{errors.name}</small> : null}
          </label>

          <datalist id="shift-type-time-options">
            {AUXILIARY_TIME_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>

          <div className="form-field-row">
            <label className="form-field-row__item">
              <span className="form-field-row__sub-label">開始</span>
              <input
                aria-invalid={Boolean(errors.start)}
                list="shift-type-time-options"
                onBlur={(event) => normalizeTime("start", event.target.value)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, start: event.target.value }))
                }
                value={values.start}
              />
              {errors.start ? <small>{errors.start}</small> : null}
            </label>
            <label className="form-field-row__item">
              <span className="form-field-row__sub-label">終了</span>
              <input
                aria-invalid={Boolean(errors.end)}
                list="shift-type-time-options"
                onBlur={(event) => normalizeTime("end", event.target.value)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, end: event.target.value }))
                }
                value={values.end}
              />
              {errors.end ? <small>{errors.end}</small> : null}
            </label>
          </div>

          <label className="form-field form-field--checkbox">
            <input
              checked={values.is_active}
              onChange={(event) =>
                setValues((current) => ({ ...current, is_active: event.target.checked }))
              }
              type="checkbox"
            />
            <span>有効（勤務表の割当に使用する）</span>
          </label>

          {saveError ? <p style={{ color: "var(--danger)" }}>{saveError}</p> : null}

          <div className="modal-form__actions">
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
