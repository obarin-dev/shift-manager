"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  type EmploymentType,
  type JobType,
  JOB_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EMPTY_STAFF_SHIFT_TIME,
  formatStaffLoginId,
  type StaffShiftTime,
} from "@/lib/staff-helpers";
import {
  StaffWorkAvailabilityField,
  validateStaffWorkAvailability,
} from "@/components/staff/staff-work-availability-field";
import {
  formatStaffClassLabels,
  type StaffClassAssignment,
} from "@/lib/staff-class-assignment";

type StaffFormValues = {
  staff_id: string;
  last_name: string;
  first_name: string;
  employment_type: EmploymentType | "";
  job_type: JobType | "";
  has_nursery_teacher_license: boolean;
  work_availability: StaffShiftTime;
  is_active: boolean;
};

type StaffFormErrors = Partial<Record<keyof StaffFormValues, string>>;

type StaffFormModalProps = {
  mode: "create" | "edit";
  open: boolean;
  classAssignment?: StaffClassAssignment;
  initialValues: StaffFormValues;
  onClose: () => void;
  onSave: (values: StaffFormValues) => void;
};

function validateStaffForm(values: StaffFormValues) {
  const errors: StaffFormErrors = {};

  if (!values.last_name.trim()) {
    errors.last_name = "姓を入力してください。";
  } else if (values.last_name.trim().length > 25) {
    errors.last_name = "姓は25文字以内で入力してください。";
  }

  if (values.first_name.trim().length > 25) {
    errors.first_name = "名は25文字以内で入力してください。";
  }

  if (!values.employment_type) {
    errors.employment_type = "雇用区分を選択してください。";
  }

  if (!values.job_type) {
    errors.job_type = "職種を選択してください。";
  }

  return errors;
}

export function StaffFormModal({
  mode,
  open,
  classAssignment,
  initialValues,
  onClose,
  onSave,
}: StaffFormModalProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [workAvailabilityError, setWorkAvailabilityError] = useState("");

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
      setWorkAvailabilityError("");
    }
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  const title = mode === "create" ? "職員新規登録" : "職員を編集";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateStaffForm(values);
    const nextWorkAvailabilityError = validateStaffWorkAvailability(
      values.work_availability,
    );

    if (Object.keys(nextErrors).length > 0 || nextWorkAvailabilityError) {
      setErrors(nextErrors);
      setWorkAvailabilityError(nextWorkAvailabilityError ?? "");
      return;
    }

    const hasAvailability =
      values.work_availability.start.trim() || values.work_availability.end.trim();

    onSave({
      ...values,
      work_availability: hasAvailability
        ? values.work_availability
        : EMPTY_STAFF_SHIFT_TIME,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="staff-form-title"
        aria-modal="true"
        className="modal-panel modal-panel--compact"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-panel__header">
          <h2 id="staff-form-title">{title}</h2>
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
          {mode === "create" ? (
            <p className="form-field__hint">
              職員IDは登録時に自動で付与されます（000001 から順に採番）。
            </p>
          ) : (
            <div className="form-field">
              <span>職員ID</span>
              <p className="class-detail-card__value">
                {values.staff_id.trim()
                  ? formatStaffLoginId(values.staff_id)
                  : "未設定（保存時に自動付与）"}
              </p>
            </div>
          )}

          <div className="modal-form__grid">
            <label className="form-field" htmlFor="staff-last-name">
              <span>姓</span>
              <input
                aria-invalid={Boolean(errors.last_name)}
                id="staff-last-name"
                name="last_name"
                onChange={(event) =>
                  setValues((current) => ({ ...current, last_name: event.target.value }))
                }
                placeholder="山田"
                type="text"
                value={values.last_name}
              />
              {errors.last_name ? <span className="field-error">{errors.last_name}</span> : null}
            </label>

            <label className="form-field" htmlFor="staff-first-name">
              <span>名</span>
              <input
                aria-invalid={Boolean(errors.first_name)}
                id="staff-first-name"
                name="first_name"
                onChange={(event) =>
                  setValues((current) => ({ ...current, first_name: event.target.value }))
                }
                placeholder="花子"
                type="text"
                value={values.first_name}
              />
              {errors.first_name ? <span className="field-error">{errors.first_name}</span> : null}
            </label>
          </div>

          <div className="modal-form__grid">
            <label className="form-field" htmlFor="staff-employment">
              <span>雇用区分</span>
              <select
                aria-invalid={Boolean(errors.employment_type)}
                id="staff-employment"
                name="employment_type"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    employment_type: event.target.value as EmploymentType | "",
                  }))
                }
                value={values.employment_type}
              >
                <option value="">選択してください</option>
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.employment_type ? (
                <span className="field-error">{errors.employment_type}</span>
              ) : null}
            </label>

            <label className="form-field" htmlFor="staff-job">
              <span>職種</span>
              <select
                aria-invalid={Boolean(errors.job_type)}
                id="staff-job"
                name="job_type"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    job_type: event.target.value as JobType | "",
                  }))
                }
                value={values.job_type}
              >
                <option value="">選択してください</option>
                {JOB_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.job_type ? (
                <span className="field-error">{errors.job_type}</span>
              ) : null}
            </label>
          </div>

          {mode === "edit" && classAssignment ? (
            <div className="form-field">
              <span>担任</span>
              <p
                className={`class-detail-card__value${
                  formatStaffClassLabels(classAssignment) !== "未設定"
                    ? ""
                    : " is-muted"
                }`}
              >
                {formatStaffClassLabels(classAssignment)}
              </p>
              <span className="form-field__hint">
                クラス管理の主担任・担任で設定したクラス名を表示します。ここでは変更できません。
              </span>
            </div>
          ) : (
            <p className="form-field__hint">
              担任はクラス管理の各クラス編集画面（主担任・担任）で設定します。
            </p>
          )}

          <label className="form-field" htmlFor="staff-license">
            <span>保育士資格</span>
            <select
              id="staff-license"
              name="has_nursery_teacher_license"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  has_nursery_teacher_license: event.target.value === "true",
                }))
              }
              value={values.has_nursery_teacher_license ? "true" : "false"}
            >
              <option value="true">あり</option>
              <option value="false">なし</option>
            </select>
          </label>

          <StaffWorkAvailabilityField
            error={workAvailabilityError}
            onChange={(work_availability) =>
              setValues((current) => ({ ...current, work_availability }))
            }
            time={values.work_availability}
          />

          <label className="form-field" htmlFor="staff-active">
            <span>状態</span>
            <select
              id="staff-active"
              name="is_active"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  is_active: event.target.value === "true",
                }))
              }
              value={values.is_active ? "true" : "false"}
            >
              <option value="true">有効</option>
              <option value="false">無効</option>
            </select>
          </label>

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

export type { StaffFormValues };

