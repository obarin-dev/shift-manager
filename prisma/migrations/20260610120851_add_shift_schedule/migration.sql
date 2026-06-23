-- CreateEnum
CREATE TYPE "ShiftScheduleStatus" AS ENUM ('draft', 'checking', 'confirmed', 'published');

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "target_month" TEXT NOT NULL,
    "status" "ShiftScheduleStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSlot" (
    "id" TEXT NOT NULL,
    "shift_schedule_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftSchedule_nursery_id_idx" ON "ShiftSchedule"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSchedule_nursery_id_target_month_key" ON "ShiftSchedule"("nursery_id", "target_month");

-- CreateIndex
CREATE INDEX "ShiftSlot_shift_schedule_id_idx" ON "ShiftSlot"("shift_schedule_id");

-- CreateIndex
CREATE INDEX "ShiftSlot_staff_id_idx" ON "ShiftSlot"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSlot_shift_schedule_id_staff_id_work_date_key" ON "ShiftSlot"("shift_schedule_id", "staff_id", "work_date");

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_shift_schedule_id_fkey" FOREIGN KEY ("shift_schedule_id") REFERENCES "ShiftSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
