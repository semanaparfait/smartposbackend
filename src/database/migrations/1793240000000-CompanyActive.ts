import { MigrationInterface, QueryRunner } from 'typeorm';

// A company the super admin can terminate and activate again. Existing companies
// stay active.
export class CompanyActive1793240000000 implements MigrationInterface {
  name = 'CompanyActive1793240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "suspended_reason" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "suspended_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "suspended_at"`,
    );
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "active"`);
  }
}
