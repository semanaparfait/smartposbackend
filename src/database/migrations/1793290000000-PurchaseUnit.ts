import { MigrationInterface, QueryRunner } from 'typeorm';

// How a product is bought, when that differs from how it is counted: stock stays in
// `unit` (Piece), deliveries can be entered in `purchase_unit` (Tray, 30 pieces).
export class PurchaseUnit1793290000000 implements MigrationInterface {
  name = 'PurchaseUnit1793290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products"
         ADD "purchase_unit" character varying(20),
         ADD "purchase_size" numeric(12,3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products"
         DROP COLUMN "purchase_size",
         DROP COLUMN "purchase_unit"`,
    );
  }
}
