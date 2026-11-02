import { MigrationInterface, QueryRunner } from 'typeorm';

// Stock lost to spoilage or spills is its own kind of movement, and each sold item
// keeps what it cost at the time, so later price changes don't alter past profit.
export class WasteAndItemCost1793280000000 implements MigrationInterface {
  name = 'WasteAndItemCost1793280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."stock_movements_reason_enum" ADD VALUE IF NOT EXISTS 'WASTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD "unit_cost" numeric(14,4)`,
    );
  }

  // Postgres can't remove an enum value, so the type is rebuilt without it.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "unit_cost"`);
    await queryRunner.query(
      `UPDATE "stock_movements" SET "reason" = 'ADJUSTMENT' WHERE "reason" = 'WASTE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."stock_movements_reason_enum" RENAME TO "stock_movements_reason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_reason_enum" AS ENUM('SALE', 'RESTOCK', 'ADJUSTMENT', 'REFUND')`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "reason" TYPE "public"."stock_movements_reason_enum" USING "reason"::text::"public"."stock_movements_reason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."stock_movements_reason_enum_old"`,
    );
  }
}
