import { MigrationInterface, QueryRunner } from 'typeorm';

// Forgot password: the emailed code (hashed), when it stops working, wrong tries.
export class PasswordReset1793500000000 implements MigrationInterface {
  name = 'PasswordReset1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_code_hash" character varying, ADD "reset_code_expires_at" TIMESTAMP WITH TIME ZONE, ADD "reset_attempts" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_attempts", DROP COLUMN "reset_code_expires_at", DROP COLUMN "reset_code_hash"`,
    );
  }
}
