import { MigrationInterface, QueryRunner } from 'typeorm';

// Whether the shop uses a kitchen screen with its own kitchen staff.
export class KitchenSetting1793450000000 implements MigrationInterface {
  name = 'KitchenSetting1793450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "kitchen_enabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "kitchen_enabled"`,
    );
  }
}
