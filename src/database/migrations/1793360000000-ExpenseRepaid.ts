import { MigrationInterface, QueryRunner } from 'typeorm';

// When a worker paid an expense with their own money: when, how and by whom the
// company paid it back.
export class ExpenseRepaid1793360000000 implements MigrationInterface {
  name = 'ExpenseRepaid1793360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_repaid_with_enum" AS ENUM('CASH', 'MOMO', 'BANK')`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses"
         ADD "repaid_at" TIMESTAMP WITH TIME ZONE,
         ADD "repaid_with" "public"."expenses_repaid_with_enum",
         ADD "repaid_by_id" uuid,
         ADD CONSTRAINT "FK_expenses_repaid_by" FOREIGN KEY ("repaid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expenses"
         DROP CONSTRAINT "FK_expenses_repaid_by",
         DROP COLUMN "repaid_by_id",
         DROP COLUMN "repaid_with",
         DROP COLUMN "repaid_at"`,
    );
    await queryRunner.query(`DROP TYPE "public"."expenses_repaid_with_enum"`);
  }
}
