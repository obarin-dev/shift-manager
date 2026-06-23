"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useStaffList } from "@/hooks/use-staff-list";
import type { StaffMember } from "@/lib/staff-helpers";

function matchesQuery(staff: StaffMember, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    staff.name.toLowerCase().includes(normalized) ||
    staff.roleLabel.toLowerCase().includes(normalized) ||
    staff.staff_id.includes(normalized)
  );
}

function pickActiveStaff(staffList: StaffMember[]) {
  return staffList.filter((staff) => staff.is_active);
}

type StaffComboboxListProps = {
  availableStaff: StaffMember[];
  filteredStaff: StaffMember[];
  listboxId: string;
  labelId: string;
  multiselectable?: boolean;
  onSelect: (staffId: string) => void;
  query: string;
  selectedIds: string[];
  isLoading?: boolean;
};

function StaffComboboxList({
  availableStaff,
  filteredStaff,
  listboxId,
  labelId,
  multiselectable,
  onSelect,
  query,
  selectedIds,
  isLoading,
}: StaffComboboxListProps) {
  return (
    <ul
      aria-labelledby={labelId}
      aria-multiselectable={multiselectable}
      className="staff-combobox__list"
      id={listboxId}
      role="listbox"
    >
      {isLoading ? (
        <li className="staff-combobox__empty" role="presentation">
          職員一覧を読み込み中…
        </li>
      ) : availableStaff.length === 0 ? (
        <li className="staff-combobox__empty" role="presentation">
          職員管理で職員を登録してください
        </li>
      ) : filteredStaff.length === 0 ? (
        <li className="staff-combobox__empty" role="presentation">
          「{query}」に一致する職員がいません
        </li>
      ) : (
        filteredStaff.map((staff) => {
          const selected = selectedIds.includes(staff.id);

          return (
            <li key={staff.id} role="presentation">
              <button
                aria-selected={selected}
                className={`staff-combobox__option${selected ? " is-selected" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(staff.id)}
                role="option"
                type="button"
              >
                <span className="staff-combobox__option-copy">
                  {staff.name}
                  <small>{staff.roleLabel}</small>
                </span>
                {selected ? (
                  <span aria-hidden="true" className="staff-combobox__check">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}

type StaffPickerSource = {
  staffMembers?: StaffMember[];
  staffLoading?: boolean;
};

function useStaffPickerSource({ staffMembers, staffLoading }: StaffPickerSource) {
  const fetched = useStaffList();

  return {
    staffList: staffMembers ?? fetched.staff,
    isLoading: staffLoading ?? (staffMembers ? false : fetched.isLoading),
  };
}

type StaffComboboxProps = StaffPickerSource & {
  excludedStaffIds?: string[];
  hint?: string;
  label: string;
  onChange: (staffId: string) => void;
  value: string;
};

export function StaffCombobox({
  staffMembers,
  staffLoading,
  excludedStaffIds = [],
  hint,
  label,
  onChange,
  value,
}: StaffComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const labelId = `${listboxId}-label`;

  const { staffList, isLoading } = useStaffPickerSource({ staffMembers, staffLoading });
  const excluded = new Set(excludedStaffIds);
  const activeStaff = pickActiveStaff(staffList);
  const selectedStaff = staffList.find((staff) => staff.id === value);
  const availableStaff = activeStaff.filter((staff) => !excluded.has(staff.id));
  const filteredStaff = availableStaff.filter((staff) => matchesQuery(staff, query));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const clearStaff = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  const selectStaff = (staffId: string) => {
    if (staffId === value) {
      clearStaff();
      return;
    }

    onChange(staffId);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "Backspace" && query === "" && value) {
      clearStaff();
    }
  };

  const showInput = !value || open || query.length > 0;

  const openPicker = () => {
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const chipLabel =
    selectedStaff?.name ??
    (isLoading && value ? "読み込み中…" : value ? "（不明な職員）" : "");

  return (
    <div className="form-field staff-combobox staff-combobox--single" ref={rootRef}>
      <span id={labelId}>{label}</span>
      {hint ? <p className="form-field__hint">{hint}</p> : null}

      <div className={`staff-combobox__control${open ? " is-open" : ""}`}>
        <div
          className={`staff-combobox__field${value && !showInput ? " staff-combobox__field--selected-only" : ""}`}
          onClick={openPicker}
          role="presentation"
        >
          {value ? (
            <span className="staff-combobox__chip">
              {chipLabel}
              <button
                aria-label={`${chipLabel}を外す`}
                className="staff-combobox__chip-remove"
                onClick={(event) => {
                  event.stopPropagation();
                  clearStaff();
                }}
                type="button"
              >
                ×
              </button>
            </span>
          ) : null}
          {showInput ? (
            <input
              ref={inputRef}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={open}
              aria-labelledby={labelId}
              className="staff-combobox__input"
              disabled={isLoading}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onClick={(event) => event.stopPropagation()}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={
                value ? "名前で検索して変更" : "職員名で検索して選択"
              }
              role="combobox"
              type="text"
              value={query}
            />
          ) : (
            <span className="staff-combobox__change">クリックして変更</span>
          )}
        </div>

        {open ? (
          <StaffComboboxList
            availableStaff={availableStaff}
            filteredStaff={filteredStaff}
            isLoading={isLoading}
            labelId={labelId}
            listboxId={listboxId}
            onSelect={selectStaff}
            query={query}
            selectedIds={value ? [value] : []}
          />
        ) : null}
      </div>
    </div>
  );
}

type StaffMultiComboboxProps = StaffPickerSource & {
  excludedStaffId?: string;
  hint?: string;
  label: string;
  onChange: (staffIds: string[]) => void;
  value: string[];
};

export function StaffMultiCombobox({
  staffMembers,
  staffLoading,
  excludedStaffId = "",
  hint,
  label,
  onChange,
  value,
}: StaffMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const labelId = `${listboxId}-label`;

  const { staffList, isLoading } = useStaffPickerSource({ staffMembers, staffLoading });
  const activeStaff = pickActiveStaff(staffList);
  const availableStaff = activeStaff.filter((staff) => staff.id !== excludedStaffId);
  const selectedStaff = staffList.filter((staff) => value.includes(staff.id));
  const filteredStaff = availableStaff.filter((staff) => matchesQuery(staff, query));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const removeStaff = (staffId: string) => {
    onChange(value.filter((id) => id !== staffId));
  };

  const toggleStaff = (staffId: string) => {
    if (value.includes(staffId)) {
      onChange(value.filter((id) => id !== staffId));
      return;
    }

    onChange([...value, staffId]);
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "Backspace" && query === "" && selectedStaff.length > 0) {
      const lastStaff = selectedStaff[selectedStaff.length - 1];
      if (lastStaff) {
        removeStaff(lastStaff.id);
      }
    }
  };

  return (
    <div className="form-field staff-combobox" ref={rootRef}>
      <span id={labelId}>{label}</span>
      {hint ? <p className="form-field__hint">{hint}</p> : null}

      <div className={`staff-combobox__control${open ? " is-open" : ""}`}>
        <div
          className="staff-combobox__field"
          onClick={() => inputRef.current?.focus()}
          role="presentation"
        >
          {selectedStaff.map((staff) => (
            <span className="staff-combobox__chip" key={staff.id}>
              {staff.name}
              <button
                aria-label={`${staff.name}を外す`}
                className="staff-combobox__chip-remove"
                onClick={() => removeStaff(staff.id)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          {value
            .filter((id) => !staffList.some((staff) => staff.id === id))
            .map((id) => (
              <span className="staff-combobox__chip is-unknown" key={id}>
                {isLoading ? "読み込み中…" : "（不明な職員）"}
                <button
                  aria-label="選択を外す"
                  className="staff-combobox__chip-remove"
                  onClick={() => removeStaff(id)}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          <input
            ref={inputRef}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-labelledby={labelId}
            className="staff-combobox__input"
            disabled={isLoading}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedStaff.length === 0 && value.length === 0
                ? "職員名で検索して追加"
                : "追加で検索"
            }
            role="combobox"
            type="text"
            value={query}
          />
        </div>

        {open ? (
          <StaffComboboxList
            availableStaff={availableStaff}
            filteredStaff={filteredStaff}
            isLoading={isLoading}
            labelId={labelId}
            listboxId={listboxId}
            multiselectable
            onSelect={toggleStaff}
            query={query}
            selectedIds={value}
          />
        ) : null}
      </div>
    </div>
  );
}
