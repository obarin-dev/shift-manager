import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { INITIAL_MOCK_CLASSROOMS } from "../src/lib/mock-classes";
import {
  INITIAL_NURSERY_CALENDAR_ENTRIES,
  INITIAL_NURSERY_PROFILE,
  INITIAL_NURSERY_REST,
  INITIAL_SHIFT_TYPES,
} from "../src/lib/mock-nursery-info";
import { MOCK_ACCOUNTS } from "../src/lib/mock-auth";
import { MOCK_STAFF } from "../src/lib/mock-staff";
import { DEFAULT_NURSERY_ID } from "../src/lib/nursery-db";
import { parseTimeToDate } from "../src/lib/nursery-time";
import { hashPassword } from "../src/lib/user-db";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const profile = INITIAL_NURSERY_PROFILE;

  const existingNursery = await prisma.nursery.findUnique({
    where: { id: DEFAULT_NURSERY_ID },
    select: { id: true },
  });
  if (!existingNursery) {
    await prisma.nursery.create({
      data: {
        id: DEFAULT_NURSERY_ID,
        name: profile.name,
        address: profile.address,
        phone_number: profile.phone_number,
        open_time: parseTimeToDate(profile.open_time),
        close_time: parseTimeToDate(profile.close_time),
        extended_close_time: parseTimeToDate(profile.extended_close_time),
        weekly_closed_weekdays: INITIAL_NURSERY_REST.weekly_closed_days,
        close_on_public_holidays: INITIAL_NURSERY_REST.close_on_public_holidays,
      },
    });
  }

  const closureSeedEntries = INITIAL_NURSERY_REST.closed_days.map((day) => ({
    id: day.id,
    entry_date: day.date,
    entry_type: "closure" as const,
    title: day.title,
    repeats_annually: day.repeats_annually,
  }));

  const calendarSeedEntries = [
    ...closureSeedEntries,
    ...INITIAL_NURSERY_CALENDAR_ENTRIES.filter(
      (entry) => !closureSeedEntries.some((closure) => closure.id === entry.id),
    ),
  ];

  for (const entry of calendarSeedEntries) {
    const exists = await prisma.calendarEntry.findUnique({
      where: { id: entry.id },
      select: { id: true },
    });
    if (exists) {
      continue;
    }
    await prisma.calendarEntry.create({
      data: {
        id: entry.id,
        nursery_id: DEFAULT_NURSERY_ID,
        entry_date: new Date(`${entry.entry_date}T12:00:00`),
        entry_type: entry.entry_type,
        title: entry.title,
        repeats_annually:
          "repeats_annually" in entry ? Boolean(entry.repeats_annually) : false,
        start_time: entry.start_time ? parseTimeToDate(entry.start_time) : null,
        end_time: entry.end_time ? parseTimeToDate(entry.end_time) : null,
        open_time: entry.open_time ? parseTimeToDate(entry.open_time) : null,
        close_time: entry.close_time ? parseTimeToDate(entry.close_time) : null,
        extended_close_time: entry.extended_close_time
          ? parseTimeToDate(entry.extended_close_time)
          : null,
        note: entry.note ?? null,
      },
    });
  }

  for (const staff of MOCK_STAFF) {
    const exists = await prisma.staff.findUnique({
      where: { id: staff.id },
      select: { id: true },
    });
    if (exists) {
      continue;
    }
    await prisma.staff.create({
      data: {
        id: staff.id,
        nursery_id: DEFAULT_NURSERY_ID,
        name: staff.name,
        employment_type: staff.employment_type,
        job_type: staff.job_type,
        capable_class_ids: staff.capable_class_ids,
        has_nursery_teacher_license: staff.has_nursery_teacher_license,
        staff_login_id: staff.staff_id,
        work_availability_start: staff.work_availability.start
          ? parseTimeToDate(staff.work_availability.start)
          : null,
        work_availability_end: staff.work_availability.end
          ? parseTimeToDate(staff.work_availability.end)
          : null,
        is_active: staff.is_active,
      },
    });
  }

  for (const classroom of INITIAL_MOCK_CLASSROOMS) {
    const exists = await prisma.classroom.findUnique({
      where: { id: classroom.id },
      select: { id: true },
    });
    if (exists) {
      continue;
    }
    await prisma.classroom.create({
      data: {
        id: classroom.id,
        nursery_id: DEFAULT_NURSERY_ID,
        name: classroom.name,
        age_group: classroom.ageGroup,
        child_count: classroom.childCount,
        auxiliary_slots: classroom.auxiliarySlots,
        main_staff_id:
          classroom.id === "class-1"
            ? "staff-1"
            : classroom.id === "class-mixed"
              ? "staff-3"
              : null,
        other_staff_ids:
          classroom.id === "class-1"
            ? ["staff-2"]
            : classroom.id === "class-mixed"
              ? ["staff-4", "staff-6"]
              : [],
        note: classroom.note || null,
      },
    });
  }

  const demoPasswordHash = await hashPassword("demo1234");
  const demoStaffLinks: Record<string, string | null> = {
    "admin@example.com": null,
    "manager@example.com": null,
    "staff@example.com": "staff-6",
  };

  for (const account of MOCK_ACCOUNTS) {
    const userId = `user-${account.role}`;
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (exists) {
      continue;
    }

    await prisma.user.create({
      data: {
        id: userId,
        nursery_id: DEFAULT_NURSERY_ID,
        staff_id: demoStaffLinks[account.email] ?? null,
        email: account.email,
        password_hash: demoPasswordHash,
        role: account.role,
        is_active: true,
      },
    });
  }

  const adminStaff = await prisma.staff.findFirst({
    where: { name: { contains: "西園" } },
    select: { id: true },
  });
  if (adminStaff) {
    await prisma.user.update({
      where: { id: "user-admin" },
      data: { staff_id: adminStaff.id },
    });
  }

  const itoStaff = await prisma.staff.findFirst({
    where: { name: { contains: "伊藤" } },
    select: { id: true },
  });
  if (itoStaff) {
    await prisma.user.update({
      where: { id: "user-staff" },
      data: { staff_id: itoStaff.id },
    });
  }

  for (const shiftType of INITIAL_SHIFT_TYPES) {
    const exists = await prisma.shiftType.findUnique({
      where: { id: shiftType.id },
      select: { id: true },
    });
    if (exists) {
      continue;
    }
    await prisma.shiftType.create({
      data: {
        id: shiftType.id,
        nursery_id: DEFAULT_NURSERY_ID,
        code: shiftType.code,
        name: shiftType.name,
        start_time: parseTimeToDate(shiftType.start),
        end_time: parseTimeToDate(shiftType.end),
        is_active: shiftType.is_active,
        sort_order: shiftType.sort_order,
        color: shiftType.color,
      },
    });
  }

  const [
    nurseryCount,
    staffCount,
    classroomCount,
    shiftTypeCount,
    calendarEntryCount,
    userCount,
  ] = await Promise.all([
    prisma.nursery.count(),
    prisma.staff.count(),
    prisma.classroom.count(),
    prisma.shiftType.count(),
    prisma.calendarEntry.count(),
    prisma.user.count(),
  ]);

  console.log("");
  console.log("Seed completed:");
  console.log(`  Nursery:    ${nurseryCount} row(s)`);
  console.log(`  Staff:      ${staffCount} row(s) (expected ${MOCK_STAFF.length})`);
  console.log(`  Classroom:  ${classroomCount} row(s) (expected ${INITIAL_MOCK_CLASSROOMS.length})`);
  console.log(
    `  ShiftType:  ${shiftTypeCount} row(s) (expected ${INITIAL_SHIFT_TYPES.length})`,
  );
  console.log(
    `  Calendar:   ${calendarEntryCount} row(s) (expected ${calendarSeedEntries.length})`,
  );
  console.log(`  User:       ${userCount} row(s) (expected ${MOCK_ACCOUNTS.length})`);

  if (staffCount < MOCK_STAFF.length) {
    throw new Error(
      `Staff の投入が不足しています。マイグレーション後に npm run db:seed を再実行してください。`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
