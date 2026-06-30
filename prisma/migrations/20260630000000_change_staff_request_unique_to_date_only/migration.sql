-- DropIndex
DROP INDEX "StaffRequest_user_id_request_date_request_type_key";

-- Delete duplicate requests for the same user+date, keeping the latest created_at
DELETE FROM "StaffRequest"
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, request_date) id
  FROM "StaffRequest"
  ORDER BY user_id, request_date, created_at DESC
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffRequest_user_id_request_date_key" ON "StaffRequest"("user_id", "request_date");
