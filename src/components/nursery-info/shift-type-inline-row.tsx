"use client";

import { useState } from "react";
import { SectionEditPencilButton } from "@/components/nursery-info/section-edit-pencil-button";
import { ShiftTypeColorPicker } from "@/components/nursery-info/shift-type-color-picker";
import { normalizeShiftColor } from "@/lib/shift-type-colors";
import {
  formatDisplayTime,
  type NurseryProfile,
  type ShiftTypeDefinition,
  validateShiftTypeTimes,
} from "@/lib/mock-nursery-info";

type ShiftTypeInlineRowProps = {
  saved: ShiftTypeDefinition;
  draft: ShiftTypeDefinition;
  profile: NurseryProfile;
  isSaving: boolean;
  isNew?: boolean;
  onChange: (draft: ShiftTypeDefinition) => void;
  onSave: () => void | Promise<boolean>;
  onCancel?: () => void;
};

function toTimeInputValue(time: string) {
  return time.length === 5 ? time : time.slice(0, 5);
}

export function ShiftTypeInlineRow({
  saved,
  draft,
  profile,
  isSaving,
  isNew = false,
  onChange,
  onSave,
  onCancel,
}: ShiftTypeInlineRowProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const timeErrors = validateShiftTypeTimes(draft, profile);

  const startEdit = () => {
    onChange({ ...saved });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (isNew) {
      onCancel?.();
      return;
    }

    onChange({ ...saved });
    setIsEditing(false);
  };

  const handleSave = async () => {
    const result = await onSave();
    if (result !== false) {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div
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
          <p style={{ margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                backgroundColor: normalizeShiftColor(saved.color) ?? "#E2E8F0",
                border: "1px solid rgba(15, 23, 42, 0.12)",
              }}
            />
            {saved.name}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            {formatDisplayTime(saved.start)} - {formatDisplayTime(saved.end)}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: saved.is_active ? "var(--primary)" : "var(--muted)",
              fontWeight: 800,
              fontSize: "0.9rem",
            }}
          >
            {saved.is_active ? "有効" : "無効"}
          </p>
        </div>

        <SectionEditPencilButton onClick={startEdit} />
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid rgba(217, 224, 234, 0.75)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "grid",
        gap: 12,
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>
        {isNew ? "新しい勤務区分" : `${saved.name}を編集`}
      </p>

      <label className="form-field shift-type-name-with-color">
        <span>区分名</span>
        <div className="shift-type-name-with-color__row">
          <input
            className="shift-type-name-with-color__name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
          <ShiftTypeColorPicker
            variant="inline"
            value={draft.color}
            onChange={(color) => onChange({ ...draft, color })}
          />
        </div>
      </label>

      <div className="form-field-row">
        <label className="form-field">
          <span>開始</span>
          <input
            type="time"
            aria-invalid={Boolean(timeErrors.start)}
            value={toTimeInputValue(draft.start)}
            onChange={(e) => onChange({ ...draft, start: e.target.value })}
          />
          {timeErrors.start ? <small>{timeErrors.start}</small> : null}
        </label>

        <label className="form-field">
          <span>終了</span>
          <input
            type="time"
            aria-invalid={Boolean(timeErrors.end)}
            value={toTimeInputValue(draft.end)}
            onChange={(e) => onChange({ ...draft, end: e.target.value })}
          />
          {timeErrors.end ? <small>{timeErrors.end}</small> : null}
        </label>
      </div>

      <label className="form-field form-field--checkbox">
        <input
          checked={draft.is_active}
          onChange={(e) => onChange({ ...draft, is_active: e.target.checked })}
          type="checkbox"
        />
        <span>有効（勤務表の割当に使用する）</span>
      </label>

      <div className="nursery-section-form__actions">
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
          disabled={isSaving || Object.keys(timeErrors).length > 0 || !draft.name.trim()}
          onClick={() => void handleSave()}
        >
          {isSaving ? "保存中…" : "変更を保存"}
        </button>
      </div>
    </div>
  );
}
