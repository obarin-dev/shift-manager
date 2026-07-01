-- Migration: User と Staff テーブルの統合 (#58)
-- User テーブルの認証情報 (email/password_hash/role) を Staff に移動し、
-- StaffRequest の user_id を staff_id に統一する。

-- Step 1: Staff にログイン用カラムを追加
ALTER TABLE "Staff" ADD COLUMN "email" TEXT;
ALTER TABLE "Staff" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "Staff" ADD COLUMN "role" "UserRole";

-- Step 2: employment_type / job_type を nullable に変更
ALTER TABLE "Staff" ALTER COLUMN "employment_type" DROP NOT NULL;
ALTER TABLE "Staff" ALTER COLUMN "job_type" DROP NOT NULL;

-- Step 3: User.staff_id が設定されているケース → 対応する Staff に認証情報をコピー
UPDATE "Staff" s
SET
  email         = u.email,
  password_hash = u.password_hash,
  role          = u.role
FROM "User" u
WHERE u.staff_id = s.id;

-- Step 4: User.staff_id が NULL のケース → 最低限の Staff レコードを生成
-- （admin/manager でスタッフ情報を持たないアカウントが対象）
INSERT INTO "Staff" (
  "id", "nursery_id", "name",
  "email", "password_hash", "role",
  "is_active", "capable_class_ids",
  "has_nursery_teacher_license",
  "can_work_early_shift", "can_work_late_shift", "can_work_extended_care"
)
SELECT
  gen_random_uuid(),
  u.nursery_id,
  split_part(u.email, '@', 1),
  u.email,
  u.password_hash,
  u.role,
  u.is_active,
  '{}'::TEXT[],
  false, false, false, false
FROM "User" u
WHERE u.staff_id IS NULL;

-- Step 5: Staff.email に nursery_id 複合ユニーク制約を追加
CREATE UNIQUE INDEX "Staff_nursery_id_email_key" ON "Staff"("nursery_id", "email")
  WHERE "email" IS NOT NULL;

-- Step 6: StaffRequest.staff_id を解決する
-- User.staff_id が設定されていた場合は既に staff_id が入っているケースもあるが、
-- user_id を軸に確実に解決する
UPDATE "StaffRequest" sr
SET staff_id = u.staff_id
FROM "User" u
WHERE u.id = sr.user_id
  AND sr.staff_id IS NULL
  AND u.staff_id IS NOT NULL;

-- staff_id を解決できない行（スタッフ情報のない admin/manager が作成した希望申請）は削除
DELETE FROM "StaffRequest" WHERE staff_id IS NULL;

-- Step 7: StaffRequest から user_id カラムを削除
ALTER TABLE "StaffRequest" DROP CONSTRAINT "StaffRequest_user_id_fkey";
ALTER TABLE "StaffRequest" DROP CONSTRAINT "StaffRequest_user_id_request_date_key";
DROP INDEX "StaffRequest_user_id_idx";
ALTER TABLE "StaffRequest" DROP COLUMN "user_id";

-- Step 8: StaffRequest.staff_id を NOT NULL 化し、FK を CASCADE に変更
ALTER TABLE "StaffRequest" ALTER COLUMN "staff_id" SET NOT NULL;
ALTER TABLE "StaffRequest" DROP CONSTRAINT "StaffRequest_staff_id_fkey";
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: (staff_id, request_date) の複合ユニーク制約を追加
CREATE UNIQUE INDEX "StaffRequest_staff_id_request_date_key"
  ON "StaffRequest"("staff_id", "request_date");

-- Step 10: User テーブルを削除
DROP TABLE "User";
