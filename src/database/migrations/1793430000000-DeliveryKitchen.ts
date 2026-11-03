import { MigrationInterface, QueryRunner } from 'typeorm';

// The kitchen's progress on a delivery paid before its food was ready.
export class DeliveryKitchen1793430000000 implements MigrationInterface {
  name = 'DeliveryKitchen1793430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_kitchen_status_enum" AS ENUM('PENDING', 'PREPARING')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "kitchen_status" "public"."orders_kitchen_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "kitchen_status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_kitchen_status_enum"`);
  }
}
