-- CreateEnum
CREATE TYPE "CalendarEntryType" AS ENUM ('closure', 'special_hours', 'event');

-- AlterTable
ALTER TABLE "Nursery" ADD COLUMN "weekly_closed_weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "entry_type" "CalendarEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "repeats_annually" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIME,
    "end_time" TIME,
    "open_time" TIME,
    "close_time" TIME,
    "extended_close_time" TIME,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEntry_nursery_id_idx" ON "CalendarEntry"("nursery_id");

-- CreateIndex
CREATE INDEX "CalendarEntry_nursery_id_entry_date_idx" ON "CalendarEntry"("nursery_id", "entry_date");

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
