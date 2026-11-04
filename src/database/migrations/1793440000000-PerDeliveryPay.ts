import { MigrationInterface, QueryRunner } from 'typeorm';

// Workers paid for each delivery instead of a monthly salary (riders).
export class PerDeliveryPay1793440000000 implements MigrationInterface {
  name = 'PerDeliveryPay1793440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."employees_pay_type_enum" AS ENUM('MONTHLY', 'PER_DELIVERY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "pay_type" "public"."employees_pay_type_enum" NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "per_delivery" numeric(14,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "per_delivery"`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "pay_type"`);
    await queryRunner.query(`DROP TYPE "public"."employees_pay_type_enum"`);
  }
}
