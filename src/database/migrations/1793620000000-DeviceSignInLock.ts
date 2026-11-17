import { MigrationInterface, QueryRunner } from 'typeorm';

// After too many wrong PINs or passwords a device is locked for a while
// (see SignInLockService). The owner or super admin can unlock it.
export class DeviceSignInLock1793620000000 implements MigrationInterface {
  name = 'DeviceSignInLock1793620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "devices"
        ADD "failed_sign_ins" integer NOT NULL DEFAULT 0,
        ADD "lock_count" integer NOT NULL DEFAULT 0,
        ADD "locked_until" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "devices"
        DROP COLUMN "locked_until",
        DROP COLUMN "lock_count",
        DROP COLUMN "failed_sign_ins"
    `);
  }
}
