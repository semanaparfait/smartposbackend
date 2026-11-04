import { MigrationInterface, QueryRunner } from 'typeorm';

// Extras the super admin turns on per company. Companies already using the app
// keep everything on; new ones start with none.
export class CompanyFeatures1793470000000 implements MigrationInterface {
  name = 'CompanyFeatures1793470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "features" jsonb NOT NULL DEFAULT '{"services":false,"delivery":false,"floorMap":false,"kitchen":false}'`,
    );
    await queryRunner.query(
      `UPDATE "companies" SET "features" = '{"services":true,"delivery":true,"floorMap":true,"kitchen":true}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "features"`);
  }
}
