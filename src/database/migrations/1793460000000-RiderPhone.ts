import { MigrationInterface, QueryRunner } from 'typeorm';

// Devices can be a rider's phone: riders sign in there for their deliveries.
export class RiderPhone1793460000000 implements MigrationInterface {
  name = 'RiderPhone1793460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."devices_type_enum" ADD VALUE IF NOT EXISTS 'RIDER_PHONE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Phones go back to being tills; Postgres can't drop one enum value, so the
    // type is rebuilt without it.
    await queryRunner.query(
      `UPDATE "devices" SET "type" = 'POS_TERMINAL' WHERE "type" = 'RIDER_PHONE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."devices_type_enum" RENAME TO "devices_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."devices_type_enum" AS ENUM('POS_TERMINAL', 'KITCHEN_DISPLAY', 'CUSTOMER_DISPLAY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ALTER COLUMN "type" DROP DEFAULT, ALTER COLUMN "type" TYPE "public"."devices_type_enum" USING "type"::text::"public"."devices_type_enum", ALTER COLUMN "type" SET DEFAULT 'POS_TERMINAL'`,
    );
    await queryRunner.query(`DROP TYPE "public"."devices_type_enum_old"`);
  }
}
