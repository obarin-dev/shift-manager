"use client";

import {
  AUXILIARY_TIME_OPTIONS,
  createAuxiliarySlotId,
  parseTimeInput,
  type AuxiliarySlotFormValue,
  type AuxiliarySlotErrors,
} from "@/lib/mock-classes";

type ClassAuxiliarySlotsFieldProps = {
  errors?: AuxiliarySlotErrors;
  onChange: (slots: AuxiliarySlotFormValue[]) => void;
  slots: AuxiliarySlotFormValue[];
};

export function ClassAuxiliarySlotsField({
  errors,
  onChange,
  slots,
}: ClassAuxiliarySlotsFieldProps) {
  const addSlot = () => {
    onChange([...slots, { id: createAuxiliarySlotId(), count: "", startTime: "", endTime: "" }]);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) {
      return;
    }

    onChange(slots.filter((slot) => slot.id !== id));
  };

  const updateSlot = (
    id: string,
    field: keyof Pick<AuxiliarySlotFormValue, "count" | "startTime" | "endTime">,
    value: string,
  ) => {
    onChange(
      slots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)),
    );
  };

  const normalizeSlotTime = (
    id: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    const parsed = parseTimeInput(value);

    if (parsed) {
      updateSlot(id, field, parsed);
    }
  };

  return (
    <div className="form-field auxiliary-slots">
      <span>補助の人数</span>

      <ul className="auxiliary-slots__list">
        <datalist id="auxiliary-time-options">
          {AUXILIARY_TIME_OPTIONS.map((time) => (
            <option key={time} value={time} />
          ))}
        </datalist>

        {slots.map((slot, index) => {
          const slotErrors = errors?.[slot.id];
          const isLast = index === slots.length - 1;

          return (
            <li className="auxiliary-slots__row" key={slot.id}>
              <div className="form-field-row auxiliary-slots__fields">
                <div className="auxiliary-slots__add-cell">
                  {isLast ? (
                    <button
                      aria-label="時間帯を追加"
                      className="auxiliary-slots__add"
                      onClick={addSlot}
                      type="button"
                    >
                      +
                    </button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="auxiliary-slots__add-placeholder"
                    />
                  )}
                </div>
                <div className="form-field-row__item auxiliary-slots__count">
                  <label className="auxiliary-slots__count-label" htmlFor={`aux-count-${slot.id}`}>
                    <span className="form-field-row__sub-label">人数</span>
                  </label>
                  <div className="auxiliary-slots__count-row">
                    <input
                      aria-invalid={Boolean(slotErrors?.count)}
                      id={`aux-count-${slot.id}`}
                      inputMode="numeric"
                      min={0}
                      onChange={(event) => updateSlot(slot.id, "count", event.target.value)}
                      type="number"
                      value={slot.count}
                    />
                  </div>
                </div>

                <div className="form-field-row__item auxiliary-slots__time">
                  <span className="form-field-row__sub-label">時間</span>
                  <div className="auxiliary-slots__time-row">
                    <div className="auxiliary-slots__time-range">
                      <input
                        aria-invalid={Boolean(slotErrors?.startTime)}
                        id={`aux-start-${slot.id}`}
                        list="auxiliary-time-options"
                        onBlur={(event) =>
                          normalizeSlotTime(slot.id, "startTime", event.target.value)
                        }
                        onChange={(event) =>
                          updateSlot(slot.id, "startTime", event.target.value)
                        }
                        placeholder="9:00"
                        type="text"
                        value={slot.startTime}
                      />
                      <span aria-hidden="true" className="auxiliary-slots__time-separator">
                        〜
                      </span>
                      <input
                        aria-invalid={Boolean(slotErrors?.endTime)}
                        id={`aux-end-${slot.id}`}
                        list="auxiliary-time-options"
                        onBlur={(event) =>
                          normalizeSlotTime(slot.id, "endTime", event.target.value)
                        }
                        onChange={(event) =>
                          updateSlot(slot.id, "endTime", event.target.value)
                        }
                        placeholder="17:00"
                        type="text"
                        value={slot.endTime}
                      />
                    </div>
                    {slots.length > 1 ? (
                      <button
                        aria-label="この時間帯を削除"
                        className="auxiliary-slots__remove"
                        onClick={() => removeSlot(slot.id)}
                        type="button"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {slotErrors?.count ? (
                <span className="field-error">{slotErrors.count}</span>
              ) : null}
              {slotErrors?.startTime ? (
                <span className="field-error">{slotErrors.startTime}</span>
              ) : null}
              {slotErrors?.endTime ? (
                <span className="field-error">{slotErrors.endTime}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <span className="form-field__hint">
        担任以外に補助が欲しい場合の人数と時間です。時間は候補から選ぶか、9:00
        のように入力できます。＋で別の時間帯を追加できます。
      </span>
    </div>
  );
}
