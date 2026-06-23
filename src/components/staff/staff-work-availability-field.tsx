"use client";

import { AUXILIARY_TIME_OPTIONS, parseTimeInput } from "@/lib/classroom-helpers";
import type { StaffShiftTime } from "@/lib/staff-helpers";

type StaffWorkAvailabilityFieldProps = {
  time: StaffShiftTime;
  error?: string;
  onChange: (time: StaffShiftTime) => void;
};

export function validateStaffWorkAvailability(time: StaffShiftTime) {
  const start = time.start.trim();
  const end = time.end.trim();

  if (!start && !end) {
    return undefined;
  }

  if (!start || !end) {
    return "開始・終了の両方を入力してください。";
  }

  const parsedStart = parseTimeInput(start);
  const parsedEnd = parseTimeInput(end);

  if (!parsedStart || !parsedEnd) {
    return "時刻は HH:MM 形式で入力してください。";
  }

  const startMatch = parsedStart.match(/^(\d{1,2}):(\d{2})$/);
  const endMatch = parsedEnd.match(/^(\d{1,2}):(\d{2})$/);

  if (!startMatch || !endMatch) {
    return "時刻は HH:MM 形式で入力してください。";
  }

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);

  if (startMinutes >= endMinutes) {
    return "終了時刻は開始時刻より後にしてください。";
  }

  return undefined;
}

export function StaffWorkAvailabilityField({
  time,
  error,
  onChange,
}: StaffWorkAvailabilityFieldProps) {
  const normalizeTime = (field: "start" | "end", value: string) => {
    const parsed = parseTimeInput(value);
    if (parsed) {
      onChange({ ...time, [field]: parsed });
    }
  };

  return (
    <fieldset className="form-field--fieldset staff-work-times">
      <legend>働ける時間</legend>
      <p className="form-field__hint">
        この時間帯に勤務可能な場合、その範囲で早番・遅番などに配置できます（例:
        07:00-19:00）。
      </p>
      <datalist id="staff-work-time-options">
        {AUXILIARY_TIME_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <div className="staff-work-times__range">
        <input
          aria-invalid={Boolean(error)}
          aria-label="開始時刻"
          list="staff-work-time-options"
          onBlur={(event) => normalizeTime("start", event.target.value)}
          onChange={(event) =>
            onChange({ ...time, start: event.target.value })
          }
          placeholder="07:00"
          type="text"
          value={time.start}
        />
        <span aria-hidden="true" className="auxiliary-slots__time-separator">
          〜
        </span>
        <input
          aria-label="終了時刻"
          list="staff-work-time-options"
          onBlur={(event) => normalizeTime("end", event.target.value)}
          onChange={(event) => onChange({ ...time, end: event.target.value })}
          placeholder="19:00"
          type="text"
          value={time.end}
        />
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </fieldset>
  );
}
