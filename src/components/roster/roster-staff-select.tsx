"use client";

import type { StaffMember } from "@/lib/mock-staff";
import { getStaffSurname } from "@/lib/mock-shift-schedule";

type RosterStaffSelectProps = {
  staff: StaffMember[];
  value: string;
  onChange: (staffId: string) => void;
  ariaLabel: string;
  excludedStaffIds?: string[];
  disabled?: boolean;
};

export function RosterStaffSelect({
  staff,
  value,
  onChange,
  ariaLabel,
  excludedStaffIds = [],
  disabled = false,
}: RosterStaffSelectProps) {
  const excluded = new Set(excludedStaffIds.filter((id) => id && id !== value));
  const activeStaff = staff.filter((member) => member.is_active);

  return (
    <select
      className="roster-grid__select"
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">—</option>
      {activeStaff
        .filter((member) => !excluded.has(member.id))
        .map((member) => (
          <option key={member.id} value={member.id}>
            {getStaffSurname(member.name)}
          </option>
        ))}
    </select>
  );
}
