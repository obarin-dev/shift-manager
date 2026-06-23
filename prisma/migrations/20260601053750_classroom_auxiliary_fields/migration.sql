-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "auxiliary_slots" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "other_staff_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
