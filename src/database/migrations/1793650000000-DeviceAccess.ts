import { MigrationInterface, QueryRunner } from 'typeorm';

// "Choose who uses each device": a new extra (off until the super admin turns
// it on) and, per device, the staff who may sign in there (empty = anyone).
export class DeviceAccess1793650000000 implements MigrationInterface {
  name = 'DeviceAccess1793650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "allowed_user_ids" uuid array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`
      UPDATE "companies"
      SET "features" = "features" || '{"deviceAccess":false}'::jsonb
      WHERE NOT ("features" ? 'deviceAccess')
    `);
    await queryRunner.query(`
      ALTER TABLE "companies" ALTER COLUMN "features"
      SET DEFAULT '{"services":false,"delivery":false,"floorMap":false,"kitchen":false,"barcode":false,"deviceAccess":false}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "allowed_user_ids"`,
    );
    await queryRunner.query(
      `UPDATE "companies" SET "features" = "features" - 'deviceAccess'`,
    );
    await queryRunner.query(`
      ALTER TABLE "companies" ALTER COLUMN "features"
      SET DEFAULT '{"services":false,"delivery":false,"floorMap":false,"kitchen":false,"barcode":false}'
    `);
  }
}
