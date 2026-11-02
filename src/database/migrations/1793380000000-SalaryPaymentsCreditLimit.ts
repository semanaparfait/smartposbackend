import { MigrationInterface, QueryRunner } from 'typeorm';

// Salaries actually paid, month by month, and how much each worker may give on
// credit in one sale.
export class SalaryPaymentsCreditLimit1793380000000 implements MigrationInterface {
  name = 'SalaryPaymentsCreditLimit1793380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "credit_limit" numeric(14,2)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."salary_payments_method_enum" AS ENUM('CASH', 'MOMO', 'BANK')`,
    );
    await queryRunner.query(
      `CREATE TABLE "salary_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "month" character varying(7) NOT NULL,
        "salary" numeric(14,2) NOT NULL,
        "deducted" numeric(14,2) NOT NULL DEFAULT 0,
        "amount" numeric(14,2) NOT NULL,
        "method" "public"."salary_payments_method_enum" NOT NULL,
        "paid_on" date NOT NULL,
        "note" text,
        "company_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "user_id" uuid,
        "debt_payment_id" uuid,
        CONSTRAINT "PK_salary_payments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_salary_payments_employee_month" ON "salary_payments" ("employee_id", "month")`,
    );
    await queryRunner.query(
      `ALTER TABLE "salary_payments"
         ADD CONSTRAINT "FK_salary_payments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_salary_payments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_salary_payments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_salary_payments_debt_payment" FOREIGN KEY ("debt_payment_id") REFERENCES "staff_debt_payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "salary_payments"`);
    await queryRunner.query(`DROP TYPE "public"."salary_payments_method_enum"`);
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "credit_limit"`,
    );
  }
}
