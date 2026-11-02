import { MigrationInterface, QueryRunner } from 'typeorm';

// Expenses workers submit with a proof, waiting for the owner's approval, and
// where the money came from (the till, their own pocket, or elsewhere).
export class ExpenseSubmissions1793350000000 implements MigrationInterface {
  name = 'ExpenseSubmissions1793350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_status_enum" AS ENUM('APPROVED', 'PENDING', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_paid_from_enum" AS ENUM('TILL_CASH', 'TILL_MOMO', 'OWN_MONEY', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses"
         ADD "status" "public"."expenses_status_enum" NOT NULL DEFAULT 'APPROVED',
         ADD "paid_from" "public"."expenses_paid_from_enum",
         ADD "proof_url" character varying,
         ADD "review_note" character varying(255),
         ADD "reviewed_at" TIMESTAMP WITH TIME ZONE,
         ADD "reviewed_by_id" uuid,
         ADD CONSTRAINT "FK_expenses_reviewed_by" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_status" ON "expenses" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_expenses_status"`);
    await queryRunner.query(
      `ALTER TABLE "expenses"
         DROP CONSTRAINT "FK_expenses_reviewed_by",
         DROP COLUMN "reviewed_by_id",
         DROP COLUMN "reviewed_at",
         DROP COLUMN "review_note",
         DROP COLUMN "proof_url",
         DROP COLUMN "paid_from",
         DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."expenses_paid_from_enum"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_status_enum"`);
  }
}
