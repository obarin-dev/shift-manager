-- CreateEnum
CREATE TYPE "ClassroomStaffRole" AS ENUM ('main', 'sub');

-- CreateTable
CREATE TABLE "ClassroomStaff" (
    "classroom_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "role" "ClassroomStaffRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomStaff_pkey" PRIMARY KEY ("classroom_id","staff_id")
);

-- CreateIndex
CREATE INDEX "ClassroomStaff_staff_id_idx" ON "ClassroomStaff"("staff_id");

-- AddForeignKey
ALTER TABLE "ClassroomStaff" ADD CONSTRAINT "ClassroomStaff_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomStaff" ADD CONSTRAINT "ClassroomStaff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: main_staff_id -> ClassroomStaff (role=main)
INSERT INTO "ClassroomStaff" (classroom_id, staff_id, role, created_at)
SELECT c.id, c.main_staff_id, 'main'::"ClassroomStaffRole", NOW()
FROM "Classroom" c
WHERE c.main_staff_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Staff" s WHERE s.id = c.main_staff_id);

-- DataMigration: other_staff_ids[] -> ClassroomStaff (role=sub)
INSERT INTO "ClassroomStaff" (classroom_id, staff_id, role, created_at)
SELECT c.id, unnested.staff_id, 'sub'::"ClassroomStaffRole", NOW()
FROM "Classroom" c,
     unnest(c.other_staff_ids) AS unnested(staff_id)
WHERE EXISTS (SELECT 1 FROM "Staff" s WHERE s.id = unnested.staff_id)
  AND (c.main_staff_id IS NULL OR unnested.staff_id != c.main_staff_id)
ON CONFLICT (classroom_id, staff_id) DO NOTHING;

-- DropForeignKey
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_main_staff_id_fkey";

-- AlterTable: drop old columns
ALTER TABLE "Classroom"
    DROP COLUMN "main_staff_id",
    DROP COLUMN "other_staff_ids";
