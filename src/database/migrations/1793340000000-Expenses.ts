import { MigrationInterface, QueryRunner } from 'typeorm';

// What the company spends to run (rent, bills, supplies), once or repeating.
export class Expenses1793340000000 implements MigrationInterface {
  name = 'Expenses1793340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_category_enum" AS ENUM('RENT', 'ELECTRICITY', 'WATER', 'INTERNET', 'WAGES', 'TRANSPORT', 'SUPPLIES', 'MAINTENANCE', 'TAX', 'MARKETING', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."expenses_repeat_enum" AS ENUM('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "title" character varying(120) NOT NULL,
        "category" "public"."expenses_category_enum" NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "repeat" "public"."expenses_repeat_enum" NOT NULL DEFAULT 'ONCE',
        "start_date" date NOT NULL,
        "end_date" date,
        "note" text,
        "company_id" uuid NOT NULL,
        "user_id" uuid,
        CONSTRAINT "PK_expenses" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_company" ON "expenses" ("company_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses"
         ADD CONSTRAINT "FK_expenses_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_expenses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "expenses"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_repeat_enum"`);
    await queryRunner.query(`DROP TYPE "public"."expenses_category_enum"`);
  }
}
