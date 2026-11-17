import { MigrationInterface, QueryRunner } from 'typeorm';

// Barcode scanning becomes an extra: on for supermarkets, off for everyone else
// until the super admin turns it on.
export class BarcodeFeature1793630000000 implements MigrationInterface {
  name = 'BarcodeFeature1793630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "companies"
      SET "features" = "features" || jsonb_build_object('barcode', "type" = 'SUPERMARKET')
    `);
    await queryRunner.query(`
      ALTER TABLE "companies" ALTER COLUMN "features"
      SET DEFAULT '{"services":false,"delivery":false,"floorMap":false,"kitchen":false,"barcode":false}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "companies" SET "features" = "features" - 'barcode'`,
    );
    await queryRunner.query(`
      ALTER TABLE "companies" ALTER COLUMN "features"
      SET DEFAULT '{"services":false,"delivery":false,"floorMap":false,"kitchen":false}'
    `);
  }
}
