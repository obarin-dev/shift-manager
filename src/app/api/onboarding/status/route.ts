import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getActiveNurseryId } from "@/lib/nursery-db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  if (session.role === "staff") return unauthorizedResponse();

  const nurseryId = await getActiveNurseryId();

  const [nursery, shiftTypeCount, staffCount, classroomCount] = await Promise.all([
    prisma.nursery.findUnique({
      where: { id: nurseryId },
      select: { open_time: true, weekly_closed_weekdays: true, close_on_public_holidays: true },
    }),
    prisma.shiftType.count({ where: { nursery_id: nurseryId } }),
    prisma.staff.count({
      where: {
        nursery_id: nurseryId,
        OR: [{ role: "staff" }, { role: null }],
      },
    }),
    prisma.classroom.count({ where: { nursery_id: nurseryId } }),
  ]);

  return NextResponse.json({
    nursingHours: nursery?.open_time != null,
    shiftTypes: shiftTypeCount >= 1,
    holidaySettings:
      (nursery?.weekly_closed_weekdays ?? []).length >= 1 ||
      nursery?.close_on_public_holidays === true,
    staff: staffCount >= 1,
    classes: classroomCount >= 1,
  });
}
