import { MigrationInterface, QueryRunner } from 'typeorm';

// What workers owe the company (shortages, advances, goods...) and what they pay
// back, so it can come off their salary.
export class StaffDebts1793370000000 implements MigrationInterface {
  name = 'StaffDebts1793370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const audit = `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb`;

    await queryRunner.query(
      `CREATE TYPE "public"."staff_debts_kind_enum" AS ENUM('SHORTAGE', 'ADVANCE', 'GOODS', 'DAMAGE', 'EXPENSE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."staff_debt_payments_method_enum" AS ENUM('CASH', 'MOMO', 'SALARY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."staff_debt_payments_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_debts" (${audit},
        "kind" "public"."staff_debts_kind_enum" NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "date" date NOT NULL,
        "note" text,
        "source" character varying(120),
        "company_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "user_id" uuid,
        CONSTRAINT "PK_staff_debts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_debt_payments" (${audit},
        "amount" numeric(14,2) NOT NULL,
        "method" "public"."staff_debt_payments_method_enum" NOT NULL,
        "status" "public"."staff_debt_payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "proof_url" character varying,
        "note" text,
        "review_note" character varying(255),
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "user_id" uuid,
        "reviewed_by_id" uuid,
        CONSTRAINT "PK_staff_debt_payments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_debts_employee" ON "staff_debts" ("employee_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_staff_debts_source" ON "staff_debts" ("company_id", "source") WHERE "source" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_debt_payments_employee" ON "staff_debt_payments" ("employee_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_debts"
         ADD CONSTRAINT "FK_staff_debts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_staff_debts_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_staff_debts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_debt_payments"
         ADD CONSTRAINT "FK_staff_debt_payments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_staff_debt_payments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_staff_debt_payments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_staff_debt_payments_reviewed_by" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "staff_debt_payments"`);
    await queryRunner.query(`DROP TABLE "staff_debts"`);
    await queryRunner.query(
      `DROP TYPE "public"."staff_debt_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."staff_debt_payments_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."staff_debts_kind_enum"`);
  }
}
