import type { Classroom } from "@/lib/classroom-helpers";

export type StaffClassAssignment = {
  homeroomClassId: string | null;
  homeroomClassName: string | null;
  assistantClassNames: string[];
};

export function getStaffClassAssignment(
  staffId: string,
  classrooms: Classroom[],
): StaffClassAssignment {
  const homeroom = classrooms.find((classroom) => classroom.mainStaffId === staffId);
  const assistantClasses = classrooms.filter((classroom) =>
    (classroom.otherStaffIds ?? []).includes(staffId),
  );

  return {
    homeroomClassId: homeroom?.id ?? null,
    homeroomClassName: homeroom?.name ?? null,
    assistantClassNames: assistantClasses.map((classroom) => classroom.name),
  };
}

/** 主担任・担任（クラス側）のいずれかで紐づくクラス名を重複なく収集 */
export function getStaffAssignedClassNames(
  assignment: StaffClassAssignment,
): string[] {
  const names: string[] = [];

  if (assignment.homeroomClassName) {
    names.push(assignment.homeroomClassName);
  }

  for (const name of assignment.assistantClassNames) {
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/** 職員画面の「担任」表示用（クラス名を「、」区切り） */
export function formatStaffClassLabels(assignment: StaffClassAssignment): string {
  const names = getStaffAssignedClassNames(assignment);
  return names.length > 0 ? names.join("、") : "未設定";
}
