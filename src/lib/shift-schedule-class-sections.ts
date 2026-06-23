import { sortClassrooms, type Classroom } from "@/lib/classroom-helpers";
import { compareStaffLoginIds, type StaffMember } from "@/lib/staff-helpers";

export type ShiftScheduleStaffRow = {
  staffId: string;
  role: "homeroom" | "assistant";
};

export type ShiftScheduleClassSection = {
  classroomId: string | null;
  className: string;
  staffRows: ShiftScheduleStaffRow[];
};

function sortStaffMembers(staffById: Map<string, StaffMember>, staffIds: string[]) {
  return staffIds
    .map((staffId) => staffById.get(staffId))
    .filter((member): member is StaffMember => Boolean(member?.is_active))
    .sort((left, right) => compareStaffLoginIds(left.staff_id, right.staff_id));
}

export function buildShiftScheduleClassSections(
  classrooms: Classroom[],
  staff: StaffMember[],
): ShiftScheduleClassSection[] {
  const activeStaff = staff.filter((member) => member.is_active);
  const staffById = new Map(activeStaff.map((member) => [member.id, member]));
  const assignedStaffIds = new Set<string>();
  const sections: ShiftScheduleClassSection[] = [];

  for (const classroom of sortClassrooms(classrooms)) {
    const staffRows: ShiftScheduleStaffRow[] = [];

    if (classroom.mainStaffId && staffById.has(classroom.mainStaffId)) {
      staffRows.push({ staffId: classroom.mainStaffId, role: "homeroom" });
      assignedStaffIds.add(classroom.mainStaffId);
    }

    for (const member of sortStaffMembers(
      staffById,
      (classroom.otherStaffIds ?? []).filter((staffId) => staffId !== classroom.mainStaffId),
    )) {
      if (assignedStaffIds.has(member.id)) {
        continue;
      }
      staffRows.push({ staffId: member.id, role: "assistant" });
      assignedStaffIds.add(member.id);
    }

    sections.push({
      classroomId: classroom.id,
      className: classroom.name,
      staffRows,
    });
  }

  const unassignedStaff = activeStaff
    .filter((member) => !assignedStaffIds.has(member.id))
    .sort((left, right) => compareStaffLoginIds(left.staff_id, right.staff_id));

  if (unassignedStaff.length > 0) {
    sections.push({
      classroomId: null,
      className: "未所属",
      staffRows: unassignedStaff.map((member) => ({
        staffId: member.id,
        role: "assistant",
      })),
    });
  }

  return sections;
}
