import { MigrationInterface, QueryRunner } from 'typeorm';

// Orders remember the table or seat they were served at (from the floor map).
export class OrderTable1793570000000 implements MigrationInterface {
  name = 'OrderTable1793570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders"
         ADD COLUMN IF NOT EXISTS "table_id" character varying(64),
         ADD COLUMN IF NOT EXISTS "table_name" character varying(40),
         ADD COLUMN IF NOT EXISTS "table_kind" character varying(40),
         ADD COLUMN IF NOT EXISTS "table_area" character varying(80)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "table_area", DROP COLUMN "table_kind", DROP COLUMN "table_name", DROP COLUMN "table_id"`,
    );
  }
}
