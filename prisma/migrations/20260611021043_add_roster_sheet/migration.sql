-- CreateTable
CREATE TABLE "RosterSheet" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RosterSheet_nursery_id_idx" ON "RosterSheet"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "RosterSheet_nursery_id_entry_date_key" ON "RosterSheet"("nursery_id", "entry_date");

-- AddForeignKey
ALTER TABLE "RosterSheet" ADD CONSTRAINT "RosterSheet_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "Nursery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
