export type EmploymentType = "seikin" | "jokin" | "hijokin";

export type JobType =
  | "nursery_teacher"
  | "nurse"
  | "cook"
  | "office"
  | "other";

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

/** ログイン用の職員ID（園内で一意・1〜999999を6桁に0埋めして保存）。 */
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
  roleLabel: string;
  capable_class_ids: string[];
  employment_type: EmploymentType;
  job_type: JobType;
  has_nursery_teacher_license: boolean;
  /** 働ける時間帯（この範囲内なら早番・遅番などに配置可能） */
  work_availability: StaffShiftTime;
  is_active: boolean;
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

export const MOCK_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    staff_id: "000001",
    name: "山田 花子",
    roleLabel: "保育士",
    capable_class_ids: ["class-1", "class-mixed"],
    employment_type: "seikin",
    job_type: "nursery_teacher",
    has_nursery_teacher_license: true,
    work_availability: { start: "07:00", end: "19:30" },
    is_active: true,
  },
  {
    id: "staff-2",
    staff_id: "000002",
    name: "佐藤 太郎",
    roleLabel: "保育士",
    capable_class_ids: ["class-1"],
    employment_type: "hijokin",
    job_type: "nursery_teacher",
    has_nursery_teacher_license: true,
    work_availability: { start: "07:30", end: "09:00" },
    is_active: true,
  },
  {
    id: "staff-3",
    staff_id: "000003",
    name: "鈴木 美咲",
    roleLabel: "保育士",
    capable_class_ids: ["class-2", "class-mixed"],
    employment_type: "jokin",
    job_type: "nursery_teacher",
    has_nursery_teacher_license: true,
    work_availability: { start: "15:00", end: "19:00" },
    is_active: true,
  },
  {
    id: "staff-4",
    staff_id: "000004",
    name: "高橋 健",
    roleLabel: "看護師",
    capable_class_ids: ["class-0"],
    employment_type: "hijokin",
    job_type: "nurse",
    has_nursery_teacher_license: false,
    work_availability: { start: "14:00", end: "18:00" },
    is_active: true,
  },
  {
    id: "staff-5",
    staff_id: "000005",
    name: "田中 由美",
    roleLabel: "調理員",
    capable_class_ids: ["class-mixed"],
    employment_type: "hijokin",
    job_type: "cook",
    has_nursery_teacher_license: false,
    work_availability: EMPTY_STAFF_SHIFT_TIME,
    is_active: true,
  },
  {
    id: "staff-6",
    staff_id: "000006",
    name: "伊藤 誠",
    roleLabel: "保育士",
    capable_class_ids: ["class-0", "class-2"],
    employment_type: "jokin",
    job_type: "nursery_teacher",
    has_nursery_teacher_license: true,
    work_availability: { start: "07:00", end: "19:00" },
    is_active: true,
  },
];

export function getStaffMember(id: string | null | undefined) {
  if (!id) {
    return undefined;
  }

  return MOCK_STAFF.find((staff) => staff.id === id);
}

export function getStaffName(id: string | null | undefined) {
  return getStaffMember(id)?.name ?? null;
}

export function getStaffNames(ids: string[] | null | undefined) {
  return (ids ?? [])
    .map((id) => getStaffName(id))
    .filter((name): name is string => Boolean(name));
}

export function normalizeStaffRoleLabel(staff: StaffMember) {
  // UI 表示のための互換: 既存の combobox は roleLabel を表示に使用する。
  return getJobTypeLabel(staff.job_type);
}
