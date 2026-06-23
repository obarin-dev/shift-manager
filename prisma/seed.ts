import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  INITIAL_NURSERY_CALENDAR_ENTRIES,
  INITIAL_NURSERY_PROFILE,
  INITIAL_NURSERY_REST,
} from "../src/lib/nursery-helpers";
import { DEFAULT_NURSERY_ID } from "../src/lib/nursery-db";
import { parseTimeToDate } from "../src/lib/nursery-time";
import { hashPassword } from "../src/lib/user-db";

const SEED_ACCOUNTS = [
  { role: "admin" as const, email: "admin@example.com" },
  { role: "manager" as const, email: "manager@example.com" },
  { role: "staff" as const, email: "staff@example.com" },
];

const SEED_STAFF = [
  { id: "staff-1", staff_id: "000001", name: "山田 花子", employment_type: "seikin" as const, job_type: "nursery_teacher" as const, has_nursery_teacher_license: true, capable_class_ids: ["class-1", "class-mixed"], work_availability: { start: "07:00", end: "19:30" }, is_active: true },
  { id: "staff-2", staff_id: "000002", name: "佐藤 太郎", employment_type: "hijokin" as const, job_type: "nursery_teacher" as const, has_nursery_teacher_license: true, capable_class_ids: ["class-1"], work_availability: { start: "07:30", end: "09:00" }, is_active: true },
  { id: "staff-3", staff_id: "000003", name: "鈴木 美咲", employment_type: "jokin" as const, job_type: "nursery_teacher" as const, has_nursery_teacher_license: true, capable_class_ids: ["class-2", "class-mixed"], work_availability: { start: "15:00", end: "19:00" }, is_active: true },
  { id: "staff-4", staff_id: "000004", name: "高橋 健", employment_type: "hijokin" as const, job_type: "nurse" as const, has_nursery_teacher_license: false, capable_class_ids: ["class-0"], work_availability: { start: "14:00", end: "18:00" }, is_active: true },
  { id: "staff-5", staff_id: "000005", name: "田中 由美", employment_type: "hijokin" as const, job_type: "cook" as const, has_nursery_teacher_license: false, capable_class_ids: ["class-mixed"], work_availability: { start: "", end: "" }, is_active: true },
  { id: "staff-6", staff_id: "000006", name: "伊藤 誠", employment_type: "jokin" as const, job_type: "nursery_teacher" as const, has_nursery_teacher_license: true, capable_class_ids: ["class-0", "class-2"], work_availability: { start: "07:00", end: "19:00" }, is_active: true },
];

const SEED_CLASSROOMS = [
  { id: "class-0", name: "0歳児クラス", ageGroup: "age_0" as const, childCount: 8, auxiliarySlots: [{ id: "aux-0-1", count: 1, time: "10:00-15:00" }], mainStaffId: null, otherStaffIds: [] as string[], note: "" },
  { id: "class-1", name: "1歳児クラス", ageGroup: "age_1" as const, childCount: 12, auxiliarySlots: [{ id: "aux-1-1", count: 1, time: "9:00-12:00" }, { id: "aux-1-2", count: 1, time: "14:00-17:00" }], mainStaffId: "staff-1", otherStaffIds: ["staff-2"], note: "" },
  { id: "class-2", name: "2歳児クラス", ageGroup: "age_2" as const, childCount: 15, auxiliarySlots: [{ id: "aux-2-1", count: 2, time: "14:00-17:00" }], mainStaffId: null, otherStaffIds: [] as string[], note: "" },
  { id: "class-mixed", name: "3・4・5歳児クラス", ageGroup: "mixed" as const, childCount: 18, auxiliarySlots: [{ id: "aux-m-1", count: 2, time: "12:00-15:00" }], mainStaffId: "staff-3", otherStaffIds: ["staff-4", "staff-6"], note: "3歳児・4歳児・5歳児を同一クラスで運営しています。" },
];

const SEED_SHIFT_TYPES = [
  { id: "shift-early", code: "early", name: "早番", start: "07:00", end: "15:00", is_active: true, sort_order: 1, color: "#BFDBFE" },
  { id: "shift-day", code: "day", name: "日勤", start: "09:00", end: "17:00", is_active: true, sort_order: 2, color: "#BBF7D0" },
  { id: "shift-late", code: "late", name: "遅番", start: "11:00", end: "19:00", is_active: true, sort_order: 3, color: "#FED7AA" },
];

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
        start_time: "start_time" in entry && entry.start_time ? parseTimeToDate(entry.start_time) : null,
        end_time: "end_time" in entry && entry.end_time ? parseTimeToDate(entry.end_time) : null,
        open_time: "open_time" in entry && entry.open_time ? parseTimeToDate(entry.open_time) : null,
        close_time: "close_time" in entry && entry.close_time ? parseTimeToDate(entry.close_time) : null,
        extended_close_time: "extended_close_time" in entry && entry.extended_close_time
          ? parseTimeToDate(entry.extended_close_time)
          : null,
        note: "note" in entry ? (entry.note ?? null) : null,
      },
    });
  }

  for (const staff of SEED_STAFF) {
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

  for (const classroom of SEED_CLASSROOMS) {
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
        main_staff_id: classroom.mainStaffId ?? null,
        other_staff_ids: classroom.otherStaffIds,
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

  for (const account of SEED_ACCOUNTS) {
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

  for (const shiftType of SEED_SHIFT_TYPES) {
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
        code: shiftType.code as import("../src/lib/nursery-helpers").ShiftTypeCode,
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
  console.log(`  Staff:      ${staffCount} row(s) (expected ${SEED_STAFF.length})`);
  console.log(`  Classroom:  ${classroomCount} row(s) (expected ${SEED_CLASSROOMS.length})`);
  console.log(
    `  ShiftType:  ${shiftTypeCount} row(s) (expected ${SEED_SHIFT_TYPES.length})`,
  );
  console.log(
    `  Calendar:   ${calendarEntryCount} row(s) (expected ${calendarSeedEntries.length})`,
  );
  console.log(`  User:       ${userCount} row(s) (expected ${SEED_ACCOUNTS.length})`);

  if (staffCount < SEED_STAFF.length) {
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
