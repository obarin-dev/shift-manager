-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "capable_class_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
