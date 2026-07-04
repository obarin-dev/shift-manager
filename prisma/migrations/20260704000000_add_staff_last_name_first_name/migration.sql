-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "first_name" TEXT,
                    ADD COLUMN "last_name" TEXT;

-- DataMigration: split existing name into last_name / first_name
-- スペースを含まない単語名（例：「管理者」）は first_name を NULL にする
UPDATE "Staff"
SET last_name = TRIM(SPLIT_PART(REGEXP_REPLACE(name, '　', ' ', 'g'), ' ', 1)),
    first_name = CASE
      WHEN POSITION(' ' IN REGEXP_REPLACE(name, '　', ' ', 'g')) > 0
      THEN NULLIF(TRIM(SUBSTRING(
        REGEXP_REPLACE(name, '　', ' ', 'g')
        FROM POSITION(' ' IN REGEXP_REPLACE(name, '　', ' ', 'g')) + 1
      )), '')
      ELSE NULL
    END;
