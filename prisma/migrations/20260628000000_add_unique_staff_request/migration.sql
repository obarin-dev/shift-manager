-- CreateIndex
CREATE UNIQUE INDEX "StaffRequest_user_id_request_date_request_type_key" ON "StaffRequest"("user_id", "request_date", "request_type");
