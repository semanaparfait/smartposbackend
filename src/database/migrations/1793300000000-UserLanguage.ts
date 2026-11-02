import { MigrationInterface, QueryRunner } from 'typeorm';

// Each person's own language for the app, so a shared device follows whoever is
// signed in.
export class UserLanguage1793300000000 implements MigrationInterface {
  name = 'UserLanguage1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "language" character varying(5) NOT NULL DEFAULT 'en'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "language"`);
  }
}
