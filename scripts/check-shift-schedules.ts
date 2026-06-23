import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const schedules = await prisma.shiftSchedule.findMany({
    orderBy: { target_month: "asc" },
    include: {
      _count: { select: { slots: true } },
    },
  });

  if (schedules.length === 0) {
    console.log("shift_schedule: 0 rows (6月・7月とも未保存)");
  } else {
    console.log("shift_schedule:");
    for (const row of schedules) {
      console.log(`  ${row.target_month}  status=${row.status}  slots=${row._count.slots}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
