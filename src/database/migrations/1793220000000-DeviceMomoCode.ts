import { MigrationInterface, QueryRunner } from 'typeorm';

// Each device has its own MoMo pay code, shown to customers when they pay.
export class DeviceMomoCode1793220000000 implements MigrationInterface {
  name = 'DeviceMomoCode1793220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "momo_code" character varying(12)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "momo_code"`);
  }
}
