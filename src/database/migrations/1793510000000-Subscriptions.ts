import { MigrationInterface, QueryRunner } from 'typeorm';

// SmartPOS subscriptions: each company's plan, price and last day paid for, and
// the payments the super admin records.
export class Subscriptions1793510000000 implements MigrationInterface {
  name = 'Subscriptions1793510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "plan" character varying(20), ADD "monthly_price" numeric(14,2) NOT NULL DEFAULT 0, ADD "paid_until" date, ADD "trial_ends" date, ADD "billing_note" text`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "amount" numeric(14,2) NOT NULL,
        "months" integer NOT NULL,
        "method" character varying(20) NOT NULL,
        "paid_on" date NOT NULL,
        "covers_from" date NOT NULL,
        "covers_to" date NOT NULL,
        "note" text,
        "recorded_by_name" character varying(120),
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_subscription_payments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_payments_company" ON "subscription_payments" ("company_id", "paid_on")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_payments" ADD CONSTRAINT "FK_subscription_payments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_payments"`);
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "billing_note", DROP COLUMN "trial_ends", DROP COLUMN "paid_until", DROP COLUMN "monthly_price", DROP COLUMN "plan"`,
    );
  }
}
