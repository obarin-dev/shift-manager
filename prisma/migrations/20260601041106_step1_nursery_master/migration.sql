-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('age_0', 'age_1', 'age_2', 'age_3', 'age_4', 'age_5', 'mixed');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('seikin', 'jokin', 'hijokin');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('nursery_teacher', 'nurse', 'cook', 'office', 'other');

-- CreateTable
CREATE TABLE "Nursery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone_number" TEXT,
    "open_time" TIME NOT NULL,
    "close_time" TIME NOT NULL,
    "extended_close_time" TIME,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nursery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age_group" "AgeGroup" NOT NULL,
    "child_count" INTEGER NOT NULL,
    "main_staff_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_kana" TEXT,
    "phone_number" TEXT,
    "employment_type" "EmploymentType" NOT NULL,
    "job_type" "JobType" NOT NULL,
    "has_nursery_teacher_license" BOOLEAN NOT NULL DEFAULT false,
    "staff_login_id" TEXT,
    "work_availability_start" TIME,
    "work_availability_end" TIME,
    "can_work_early_shift" BOOLEAN NOT NULL DEFAULT false,
    "can_work_late_shift" BOOLEAN NOT NULL DEFAULT false,
    "can_work_extended_care" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_nursery_id_idx" ON "Classroom"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_nursery_id_name_key" ON "Classroom"("nursery_id", "name");

-- CreateIndex
CREATE INDEX "Staff_nursery_id_idx" ON "Staff"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_nursery_id_staff_login_id_key" ON "Staff"("nursery_id", "staff_login_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_staff_id_key" ON "User"("staff_id");

-- CreateIndex
CREATE INDEX "User_nursery_id_idx" ON "User"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_nursery_id_email_key" ON "User"("nursery_id", "email");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_main_staff_id_fkey" FOREIGN KEY ("main_staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
