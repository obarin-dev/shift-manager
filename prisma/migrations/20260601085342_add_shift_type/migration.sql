-- CreateEnum
CREATE TYPE "ShiftTypeCode" AS ENUM ('early', 'day', 'late', 'extended', 'other');

-- CreateTable
CREATE TABLE "ShiftType" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "code" "ShiftTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftType_nursery_id_idx" ON "ShiftType"("nursery_id");

-- AddForeignKey
ALTER TABLE "ShiftType" ADD CONSTRAINT "ShiftType_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
