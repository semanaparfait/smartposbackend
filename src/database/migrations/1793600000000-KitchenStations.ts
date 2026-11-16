import { MigrationInterface, QueryRunner } from 'typeorm';

// Kitchen stations: the kitchen, the bar, the grill. Categories and products say
// which station makes them, kitchen displays show one station, each order item
// keeps the station it went to, and each order tracks every station's part.
// Companies without stations keep working as before.
export class KitchenStations1793600000000 implements MigrationInterface {
  name = 'KitchenStations1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdBy" jsonb,
        "updatedBy" jsonb,
        "company_id" uuid NOT NULL,
        "name" character varying(40) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_stations_company_name" UNIQUE ("company_id", "name"),
        CONSTRAINT "PK_stations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stations_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stations_company" ON "stations" ("company_id")`,
    );

    // Deleting a station sends its categories, products and screens back to
    // the default; past items just lose the link.
    for (const table of ['product_categories', 'products', 'devices', 'items'])
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD "station_id" uuid,
          ADD CONSTRAINT "FK_${table}_station" FOREIGN KEY ("station_id")
            REFERENCES "stations"("id") ON DELETE SET NULL
      `);

    await queryRunner.query(`ALTER TABLE "orders" ADD "station_status" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "station_status"`,
    );
    for (const table of ['items', 'devices', 'products', 'product_categories'])
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP CONSTRAINT "FK_${table}_station",
          DROP COLUMN "station_id"
      `);
    await queryRunner.query(`DROP TABLE "stations"`);
  }
}
