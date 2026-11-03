import { MigrationInterface, QueryRunner } from 'typeorm';

// Checks of workers' daily takings, kept on the server so every device sees them
// (they used to live only on the device that made them).
export class MoneyChecks1793400000000 implements MigrationInterface {
  name = 'MoneyChecks1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."money_checks_status_enum" AS ENUM('VERIFIED', 'FLAGGED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "money_checks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "date" date NOT NULL,
        "status" "public"."money_checks_status_enum" NOT NULL,
        "counted" jsonb NOT NULL DEFAULT '{}',
        "expected" jsonb NOT NULL DEFAULT '{}',
        "difference" numeric(14,2) NOT NULL DEFAULT 0,
        "note" text,
        "decided_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "decided_by_name" character varying(120) NOT NULL,
        "company_id" uuid NOT NULL,
        "worker_id" uuid NOT NULL,
        "decided_by_id" uuid,
        CONSTRAINT "PK_money_checks" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_money_checks_company_date_worker" ON "money_checks" ("company_id", "date", "worker_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "money_checks"
         ADD CONSTRAINT "FK_money_checks_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_money_checks_worker" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_money_checks_decided_by" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "money_checks"`);
    await queryRunner.query(`DROP TYPE "public"."money_checks_status_enum"`);
  }
}
