import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function isPrismaClientReady(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(
    client && "shiftSchedule" in client && "rosterSheet" in client && "staffRequest" in client && "classroomStaff" in client,
  );
}

const cached = globalForPrisma.prisma;
export const prisma = isPrismaClientReady(cached) ? cached : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
