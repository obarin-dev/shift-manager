import type { AgeGroup } from "@/generated/prisma/client";
export type { AgeGroup };

export type AuxiliaryStaffSlot = {
  id: string;
  count: number;
  time: string;
};

export type Classroom = {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  childCount: number;
  auxiliarySlots: AuxiliaryStaffSlot[];
  mainStaffId: string | null;
  otherStaffIds: string[];
  note: string;
};

export const AGE_GROUP_OPTIONS: Array<{ value: AgeGroup; label: string }> = [
  { value: "age_0", label: "0歳児" },
  { value: "age_1", label: "1歳児" },
  { value: "age_2", label: "2歳児" },
  { value: "age_3", label: "3歳児" },
  { value: "age_4", label: "4歳児" },
  { value: "age_5", label: "5歳児" },
  { value: "mixed", label: "混合" },
];

const AGE_GROUP_ORDER = AGE_GROUP_OPTIONS.map((option) => option.value);

export function getAgeGroupLabel(ageGroup: AgeGroup) {
  return AGE_GROUP_OPTIONS.find((option) => option.value === ageGroup)?.label ?? ageGroup;
}

export function createAuxiliarySlotId() {
  return `aux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatTimeLabel(hour: number, minute: number) {
  return `${hour}:${padTimePart(minute)}`;
}

export function generateTimeOptions(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  stepMinutes: number,
) {
  const options: string[] = [];
  let totalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  while (totalMinutes <= endTotalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    options.push(formatTimeLabel(hour, minute));
    totalMinutes += stepMinutes;
  }

  return options;
}

export const AUXILIARY_TIME_OPTIONS = generateTimeOptions(7, 0, 19, 0, 30);

function normalizeTimeValue(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return value.trim();
  }

  return formatTimeLabel(Number(match[1]), Number(match[2]));
}

export function parseTimeInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return formatTimeLabel(hour, minute);
}

export function parseAuxiliaryTimeRange(time: string) {
  const trimmed = time.trim();

  if (!trimmed) {
    return { startTime: "", endTime: "" };
  }

  const match = trimmed.match(/^(\d{1,2}:\d{2})\s*[-–〜~]\s*(\d{1,2}:\d{2})$/);

  if (!match) {
    return { startTime: "", endTime: "" };
  }

  return {
    startTime: normalizeTimeValue(match[1]),
    endTime: normalizeTimeValue(match[2]),
  };
}

export function formatAuxiliaryTimeRange(startTime: string, endTime: string) {
  const start = startTime.trim();
  const end = endTime.trim();

  if (!start && !end) {
    return "";
  }

  if (start && end) {
    return `${start}-${end}`;
  }

  return start || end;
}

function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return Number.NaN;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function sortClassrooms(classrooms: Classroom[]) {
  return [...classrooms].sort((a, b) => {
    const ageDiff =
      AGE_GROUP_ORDER.indexOf(a.ageGroup) - AGE_GROUP_ORDER.indexOf(b.ageGroup);

    if (ageDiff !== 0) {
      return ageDiff;
    }

    return a.name.localeCompare(b.name, "ja");
  });
}

export function createClassroomId() {
  return `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type AuxiliarySlotFormValue = {
  id: string;
  count: string;
  startTime: string;
  endTime: string;
};

export type ClassroomFormValues = {
  name: string;
  ageGroup: AgeGroup | "";
  childCount: string;
  auxiliarySlots: AuxiliarySlotFormValue[];
  mainStaffId: string;
  otherStaffIds: string[];
  note: string;
};

export function emptyAuxiliarySlot(): AuxiliarySlotFormValue {
  return {
    id: createAuxiliarySlotId(),
    count: "",
    startTime: "",
    endTime: "",
  };
}

export function classroomToFormValues(classroom: Classroom): ClassroomFormValues {
  return {
    name: classroom.name,
    ageGroup: classroom.ageGroup,
    childCount: String(classroom.childCount),
    auxiliarySlots:
      (classroom.auxiliarySlots?.length ?? 0) > 0
        ? (classroom.auxiliarySlots ?? []).map((slot) => {
            const { startTime, endTime } = parseAuxiliaryTimeRange(slot.time);

            return {
              id: slot.id,
              count: String(slot.count),
              startTime,
              endTime,
            };
          })
        : [emptyAuxiliarySlot()],
    mainStaffId: classroom.mainStaffId ?? "",
    otherStaffIds: [...(classroom.otherStaffIds ?? [])],
    note: classroom.note,
  };
}

export function emptyClassroomFormValues(): ClassroomFormValues {
  return {
    name: "",
    ageGroup: "",
    childCount: "",
    auxiliarySlots: [emptyAuxiliarySlot()],
    mainStaffId: "",
    otherStaffIds: [],
    note: "",
  };
}

export function normalizeStaffAssignment(
  mainStaffId: string,
  otherStaffIds: string[],
) {
  const main = mainStaffId.trim() || null;
  const others = otherStaffIds.filter((id) => id !== main);

  return {
    mainStaffId: main,
    otherStaffIds: others,
  };
}

export function normalizeAuxiliarySlots(slots: AuxiliarySlotFormValue[]) {
  return slots
    .filter(
      (slot) =>
        slot.count.trim() !== "" ||
        slot.startTime.trim() !== "" ||
        slot.endTime.trim() !== "",
    )
    .map((slot) => ({
      id: slot.id || createAuxiliarySlotId(),
      count: Number(slot.count),
      time: formatAuxiliaryTimeRange(
        parseTimeInput(slot.startTime) ?? slot.startTime.trim(),
        parseTimeInput(slot.endTime) ?? slot.endTime.trim(),
      ),
    }))
    .filter((slot) => slot.count > 0 && slot.time.length > 0);
}

export type ClassroomFormErrors = Partial<
  Record<Exclude<keyof ClassroomFormValues, "auxiliarySlots">, string>
>;

export type AuxiliarySlotErrors = Record<
  string,
  Partial<
    Record<keyof Pick<AuxiliarySlotFormValue, "count" | "startTime" | "endTime">, string>
  >
>;

export function validateClassroomForm(
  values: ClassroomFormValues,
  classrooms: Classroom[],
  editingId?: string,
) {
  const errors: ClassroomFormErrors = {};
  const auxiliarySlotErrors: AuxiliarySlotErrors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = "クラス名を入力してください。";
  } else if (name.length > 50) {
    errors.name = "クラス名は50文字以内で入力してください。";
  } else if (
    classrooms.some(
      (classroom) =>
        classroom.id !== editingId && classroom.name.trim() === name,
    )
  ) {
    errors.name = "同じクラス名が既に登録されています。";
  }

  if (!values.ageGroup) {
    errors.ageGroup = "年齢区分を選択してください。";
  }

  const childCount = Number(values.childCount);

  if (values.childCount.trim() === "" || Number.isNaN(childCount)) {
    errors.childCount = "園児数は0以上の数値で入力してください。";
  } else if (!Number.isInteger(childCount) || childCount < 0 || childCount > 999) {
    errors.childCount = "園児数は0以上の数値で入力してください。";
  }

  values.auxiliarySlots.forEach((slot) => {
    const hasCount = slot.count.trim() !== "";
    const hasStart = slot.startTime.trim() !== "";
    const hasEnd = slot.endTime.trim() !== "";
    const hasTime = hasStart || hasEnd;

    if (!hasCount && !hasTime) {
      return;
    }

    const slotError: NonNullable<AuxiliarySlotErrors[string]> = {};
    const count = Number(slot.count);

    if (!hasCount || Number.isNaN(count)) {
      slotError.count = "人数は0以上の数値で入力してください。";
    } else if (!Number.isInteger(count) || count < 0 || count > 99) {
      slotError.count = "人数は0以上の数値で入力してください。";
    }

    if (hasTime) {
      if (!hasStart) {
        slotError.startTime = "開始時間を入力してください。";
      } else if (!parseTimeInput(slot.startTime)) {
        slotError.startTime = "時刻は H:MM 形式で入力してください。";
      }

      if (!hasEnd) {
        slotError.endTime = "終了時間を入力してください。";
      } else if (!parseTimeInput(slot.endTime)) {
        slotError.endTime = "時刻は H:MM 形式で入力してください。";
      }

      if (
        hasStart &&
        hasEnd &&
        parseTimeInput(slot.startTime) &&
        parseTimeInput(slot.endTime) &&
        !slotError.startTime &&
        !slotError.endTime
      ) {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);

        if (endMinutes <= startMinutes) {
          slotError.endTime = "終了時間は開始時間より後にしてください。";
        }
      }
    }

    if (Object.keys(slotError).length > 0) {
      auxiliarySlotErrors[slot.id] = slotError;
    }
  });

  if (values.note.length > 500) {
    errors.note = "補足メモは500文字以内で入力してください。";
  }

  return {
    errors,
    auxiliarySlotErrors,
  };
}
