import { MigrationInterface, QueryRunner } from 'typeorm';

// What the server said back, e.g. "Wrong PIN" or "Not enough stock", so the
// device log reads as plain words instead of a status code.
export class DeviceActivityMessage1793640000000 implements MigrationInterface {
  name = 'DeviceActivityMessage1793640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_activities" ADD "message" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_activities" DROP COLUMN "message"`,
    );
  }
}
