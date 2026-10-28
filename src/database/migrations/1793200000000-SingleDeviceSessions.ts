import { MigrationInterface, QueryRunner } from 'typeorm';

// Employees are signed in on one device at a time unless the owner allows more.
// session_id is the session currently allowed; NULL until their next login, so
// existing sessions keep working.
export class SingleDeviceSessions1793200000000 implements MigrationInterface {
  name = 'SingleDeviceSessions1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "allow_multiple_devices" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "session_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "session_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "allow_multiple_devices"`,
    );
  }
}
