"use client";

import {
  DEFAULT_SHIFT_TYPE_COLOR,
  SHIFT_COLOR_PRESETS,
  normalizeShiftColor,
} from "@/lib/shift-type-colors";

type ShiftTypeColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  /** 区分名の横に並べるコンパクト表示 */
  variant?: "default" | "inline";
};

export function ShiftTypeColorPicker({
  value,
  onChange,
  variant = "default",
}: ShiftTypeColorPickerProps) {
  const normalized = normalizeShiftColor(value) ?? DEFAULT_SHIFT_TYPE_COLOR;

  const presets = (
    <div className="shift-type-color-picker__presets" role="group" aria-label="勤務表の色">
      {SHIFT_COLOR_PRESETS.map((preset) => {
        const active = normalized === preset.value.toUpperCase();
        return (
          <button
            key={preset.id}
            type="button"
            className={
              active
                ? "shift-type-color-picker__swatch is-active"
                : "shift-type-color-picker__swatch"
            }
            title={preset.label}
            aria-label={preset.label}
            aria-pressed={active}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
          />
        );
      })}
    </div>
  );

  const customInput = (
    <label className="shift-type-color-picker__custom">
      <span className="shift-type-color-picker__custom-label">他</span>
      <input
        type="color"
        value={normalized}
        aria-label="カスタム色"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  if (variant === "inline") {
    return (
      <div className="shift-type-color-picker shift-type-color-picker--inline">
        {presets}
        {customInput}
      </div>
    );
  }

  return (
    <div className="shift-type-color-picker">
      <span className="shift-type-color-picker__label">勤務表の色</span>
      {presets}
      {customInput}
    </div>
  );
}
