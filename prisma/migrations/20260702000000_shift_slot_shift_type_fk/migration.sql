-- NOT NULL 制約を先に外し、"off" を NULL に変換してからリネームと FK 追加
ALTER TABLE "ShiftSlot" ALTER COLUMN "shift_type" DROP NOT NULL;

UPDATE "ShiftSlot" SET "shift_type" = NULL WHERE "shift_type" = 'off';

ALTER TABLE "ShiftSlot" RENAME COLUMN "shift_type" TO "shift_type_id";

CREATE INDEX "ShiftSlot_shift_type_id_idx" ON "ShiftSlot"("shift_type_id");

ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
