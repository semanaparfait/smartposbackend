import { MigrationInterface, QueryRunner } from 'typeorm';

// Each cook can belong to one kitchen station (they sign in and start orders
// only there), and orders keep who started preparing them.
export class KitchenPreparer1793610000000 implements MigrationInterface {
  name = 'KitchenPreparer1793610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD "station_id" uuid,
        ADD CONSTRAINT "FK_employees_station" FOREIGN KEY ("station_id")
          REFERENCES "stations"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE "orders" ADD "prepared_by" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "prepared_by"`);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP CONSTRAINT "FK_employees_station",
        DROP COLUMN "station_id"
    `);
  }
}
