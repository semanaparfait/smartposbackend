import { MigrationInterface, QueryRunner } from 'typeorm';

// The floor map saved on the server (one per company) and the live state of
// each table (taken, booked, cleaning), shared by every worker.
export class VenueMap1793560000000 implements MigrationInterface {
  name = 'VenueMap1793560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "venue_layouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "layout" jsonb NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "saved_by_name" character varying(120),
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_venue_layouts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_venue_layouts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_venue_layouts_company" ON "venue_layouts" ("company_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "venue_tables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "table_id" character varying(64) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'available',
        "order_id" uuid,
        "booking" jsonb,
        "since" TIMESTAMP WITH TIME ZONE NOT NULL,
        "served_by_id" uuid,
        "served_by_name" character varying(120),
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_venue_tables" PRIMARY KEY ("id"),
        CONSTRAINT "FK_venue_tables_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_venue_tables_company_table" ON "venue_tables" ("company_id", "table_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "venue_tables"`);
    await queryRunner.query(`DROP TABLE "venue_layouts"`);
  }
}
