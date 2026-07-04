import type { EmploymentType, JobType } from "@/generated/prisma/client";
export type { EmploymentType, JobType };

export const EMPLOYMENT_TYPE_OPTIONS: Array<{
  value: EmploymentType;
  label: string;
}> = [
  { value: "seikin", label: "正勤" },
  { value: "jokin", label: "常勤" },
  { value: "hijokin", label: "非常勤" },
];

export const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: "nursery_teacher", label: "保育士" },
  { value: "nurse", label: "看護師" },
  { value: "cook", label: "調理員" },
  { value: "office", label: "事務" },
  { value: "other", label: "その他" },
];

export function getEmploymentTypeLabel(type: EmploymentType) {
  return (
    EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function getJobTypeLabel(type: JobType) {
  return JOB_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export const STAFF_LOGIN_ID_INPUT_PATTERN = /^\d{1,6}$/;

export function normalizeStaffLoginId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (!STAFF_LOGIN_ID_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const numeric = Number(trimmed);
  if (numeric < 1 || numeric > 999999) {
    return null;
  }

  return String(numeric).padStart(6, "0");
}

export function staffLoginIdToInput(staffId: string) {
  const trimmed = staffId.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return "";
  }

  return String(Number(trimmed));
}

export type StaffShiftTime = {
  start: string;
  end: string;
};

export const EMPTY_STAFF_SHIFT_TIME: StaffShiftTime = {
  start: "",
  end: "",
};

export type StaffMember = {
  id: string;
  staff_id: string;
  name: string;
  last_name: string;
  first_name: string;
  role: string | null;
  roleLabel: string;
  capable_class_ids: string[];
  employment_type: EmploymentType;
  job_type: JobType;
  has_nursery_teacher_license: boolean;
  work_availability: StaffShiftTime;
  is_active: boolean;
  hasAccount: boolean;
};

export function formatStaffShiftTimeRange(time: StaffShiftTime) {
  const start = time.start.trim();
  const end = time.end.trim();

  if (!start && !end) {
    return "";
  }

  if (start && end) {
    return `${start}-${end}`;
  }

  return start || end;
}

export function formatStaffWorkAvailability(
  staff: Pick<StaffMember, "work_availability">,
) {
  return formatStaffShiftTimeRange(staff.work_availability);
}

export function formatStaffLoginId(staffId: string) {
  const trimmed = staffId.trim();
  if (!trimmed) {
    return "未設定";
  }

  if (/^\d+$/.test(trimmed)) {
    return String(Number(trimmed)).padStart(6, "0");
  }

  return trimmed;
}

export function compareStaffLoginIds(a: string, b: string) {
  const aTrimmed = a.trim();
  const bTrimmed = b.trim();

  if (!aTrimmed && !bTrimmed) {
    return 0;
  }
  if (!aTrimmed) {
    return 1;
  }
  if (!bTrimmed) {
    return -1;
  }

  return Number(aTrimmed) - Number(bTrimmed);
}

export function normalizeStaffRoleLabel(staff: StaffMember) {
  return getJobTypeLabel(staff.job_type);
}
