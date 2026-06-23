-- AlterTable
ALTER TABLE "ShiftSchedule" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "published_payload" JSONB;
