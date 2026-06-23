CREATE TYPE "StaffRequestType" AS ENUM ('day_off', 'work', 'time_consultation');

CREATE TYPE "StaffRequestStatus" AS ENUM ('submitted', 'approved', 'needs_review');

CREATE TABLE "StaffRequest" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "request_date" DATE NOT NULL,
    "request_type" "StaffRequestType" NOT NULL,
    "time_preference" TEXT NOT NULL,
    "memo" TEXT,
    "status" "StaffRequestStatus" NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffRequest_nursery_id_request_date_idx" ON "StaffRequest"("nursery_id", "request_date");

CREATE INDEX "StaffRequest_user_id_idx" ON "StaffRequest"("user_id");

CREATE INDEX "StaffRequest_staff_id_idx" ON "StaffRequest"("staff_id");

ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
