-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "first_name" TEXT,
                    ADD COLUMN "last_name" TEXT;

-- DataMigration: split existing name into last_name / first_name
UPDATE "Staff"
SET last_name = TRIM(SPLIT_PART(REGEXP_REPLACE(name, '　', ' ', 'g'), ' ', 1)),
    first_name = NULLIF(TRIM(SUBSTRING(
      REGEXP_REPLACE(name, '　', ' ', 'g')
      FROM POSITION(' ' IN REGEXP_REPLACE(name, '　', ' ', 'g')) + 1
    )), '');
