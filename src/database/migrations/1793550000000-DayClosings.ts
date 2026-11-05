import { MigrationInterface, QueryRunner } from 'typeorm';

// Closing the business day: money and stock checked, the owners told.
export class DayClosings1793550000000 implements MigrationInterface {
  name = 'DayClosings1793550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "day_closings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "business_day" date NOT NULL,
        "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "closed_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "closed_by_id" uuid,
        "closed_by_name" character varying(120) NOT NULL,
        "money" jsonb NOT NULL,
        "orders" jsonb NOT NULL,
        "stock" jsonb NOT NULL,
        "note" text,
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_day_closings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_day_closings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_day_closings_company_closed" ON "day_closings" ("company_id", "closed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "day_closings"`);
  }
}
