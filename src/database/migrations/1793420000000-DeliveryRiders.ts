import { MigrationInterface, QueryRunner } from 'typeorm';

// Whether the shop has its own riders (if not, the app doesn't ask who takes it).
export class DeliveryRiders1793420000000 implements MigrationInterface {
  name = 'DeliveryRiders1793420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "delivery_riders" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "delivery_riders"`,
    );
  }
}
