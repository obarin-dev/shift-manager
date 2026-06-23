"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  AGE_GROUP_OPTIONS,
  type ClassroomFormErrors,
  type ClassroomFormValues,
  validateClassroomForm,
  type Classroom,
} from "@/lib/classroom-helpers";
import { ClassAuxiliarySlotsField } from "@/components/classes/class-auxiliary-slots-field";
import { StaffCombobox, StaffMultiCombobox } from "@/components/classes/staff-combobox";
import type { AuxiliarySlotErrors } from "@/lib/classroom-helpers";
import type { StaffMember } from "@/lib/staff-helpers";

type ClassFormModalProps = {
  mode: "create" | "edit";
  open: boolean;
  classrooms: Classroom[];
  staffMembers: StaffMember[];
  staffLoading?: boolean;
  initialValues: ClassroomFormValues;
  editingId?: string;
  onClose: () => void;
  onSave: (values: ClassroomFormValues) => void;
};

export function ClassFormModal({
  mode,
  open,
  classrooms,
  staffMembers,
  staffLoading = false,
  initialValues,
  editingId,
  onClose,
  onSave,
}: ClassFormModalProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ClassroomFormErrors>({});
  const [auxiliarySlotErrors, setAuxiliarySlotErrors] = useState<AuxiliarySlotErrors>(
    {},
  );

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
      setAuxiliarySlotErrors({});
    }
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  const title = mode === "create" ? "クラスを追加" : "クラスを編集";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors: nextErrors, auxiliarySlotErrors: nextAuxiliaryErrors } =
      validateClassroomForm(values, classrooms, editingId);

    if (
      Object.keys(nextErrors).length > 0 ||
      Object.keys(nextAuxiliaryErrors).length > 0
    ) {
      setErrors(nextErrors);
      setAuxiliarySlotErrors(nextAuxiliaryErrors);
      return;
    }

    onSave(values);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="class-form-title"
        aria-modal="true"
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-panel__header">
          <h2 id="class-form-title">{title}</h2>
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
          <label className="form-field" htmlFor="class-name">
            <span>クラス名</span>
            <input
              aria-invalid={Boolean(errors.name)}
              id="class-name"
              name="name"
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              type="text"
              value={values.name}
            />
            {errors.name ? <span className="field-error">{errors.name}</span> : null}
          </label>

          <label className="form-field" htmlFor="class-age-group">
            <span>年齢区分</span>
            <select
              aria-invalid={Boolean(errors.ageGroup)}
              id="class-age-group"
              name="ageGroup"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  ageGroup: event.target.value as ClassroomFormValues["ageGroup"],
                }))
              }
              value={values.ageGroup}
            >
              <option value="">選択してください</option>
              {AGE_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.ageGroup ? (
              <span className="field-error">{errors.ageGroup}</span>
            ) : null}
          </label>

          <label className="form-field" htmlFor="class-child-count">
            <span>園児数</span>
            <input
              aria-invalid={Boolean(errors.childCount)}
              id="class-child-count"
              inputMode="numeric"
              min={0}
              name="childCount"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  childCount: event.target.value,
                }))
              }
              type="number"
              value={values.childCount}
            />
            {errors.childCount ? (
              <span className="field-error">{errors.childCount}</span>
            ) : null}
          </label>

          <StaffCombobox
            excludedStaffIds={values.otherStaffIds}
            hint="1名のみ選択できます。職員管理に登録した職員から選びます。"
            label="主担任"
            staffLoading={staffLoading}
            staffMembers={staffMembers}
            onChange={(mainStaffId) =>
              setValues((current) => ({
                ...current,
                mainStaffId,
                otherStaffIds: current.otherStaffIds.filter(
                  (id) => id !== mainStaffId,
                ),
              }))
            }
            value={values.mainStaffId}
          />

          <StaffMultiCombobox
            excludedStaffId={values.mainStaffId}
            hint="主担任以外でクラスに関わる担任を選びます。職員管理の一覧には表示しません。"
            label="担任"
            staffLoading={staffLoading}
            staffMembers={staffMembers}
            onChange={(otherStaffIds) =>
              setValues((current) => ({ ...current, otherStaffIds }))
            }
            value={values.otherStaffIds}
          />

          <ClassAuxiliarySlotsField
            errors={auxiliarySlotErrors}
            onChange={(auxiliarySlots) =>
              setValues((current) => ({ ...current, auxiliarySlots }))
            }
            slots={values.auxiliarySlots}
          />

          <label className="form-field" htmlFor="class-note">
            <span>補足メモ</span>
            <textarea
              id="class-note"
              name="note"
              onChange={(event) =>
                setValues((current) => ({ ...current, note: event.target.value }))
              }
              rows={3}
              value={values.note}
            />
            {errors.note ? <span className="field-error">{errors.note}</span> : null}
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
