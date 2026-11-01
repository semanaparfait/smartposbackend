import { MigrationInterface, QueryRunner } from 'typeorm';

// The shop's tax number, printed on its receipts.
export class CompanyTin1793230000000 implements MigrationInterface {
  name = 'CompanyTin1793230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "tin" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "tin"`);
  }
}
