-- Fix: パーシャルインデックスを通常のユニーク制約に置き換える
-- 前回マイグレーション (20260701000000) が WHERE "email" IS NOT NULL の部分インデックスを
-- 作成したが、Prisma スキーマの @@unique([nursery_id, email]) は全行対象の制約を期待するため
-- prisma migrate dev のたびにドリフトとして検出される。
-- PostgreSQL では NULL = NULL が成立しないため、全行対象のユニーク制約でも
-- email=NULL の Staff を複数持つことができる（動作は変わらない）。

DROP INDEX "Staff_nursery_id_email_key";

CREATE UNIQUE INDEX "Staff_nursery_id_email_key" ON "Staff"("nursery_id", "email");
