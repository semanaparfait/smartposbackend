import { MigrationInterface, QueryRunner } from 'typeorm';

// An order the kitchen finished and a worker has taken to the customer.
export class OrderServed1793260000000 implements MigrationInterface {
  name = 'OrderServed1793260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'SERVED' AFTER 'READY'`,
    );
  }

  // Postgres can't remove an enum value, so the type is rebuilt without it.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "orders" SET "status" = 'READY' WHERE "status" = 'SERVED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::text::"public"."orders_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
  }
}
