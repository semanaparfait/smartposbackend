import { MigrationInterface, QueryRunner } from 'typeorm';

// What each device is used for. Existing devices are tills, so they keep working
// as before. A customer display points at the till whose cart it shows.
export class DeviceTypes1793210000000 implements MigrationInterface {
  name = 'DeviceTypes1793210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."devices_type_enum" AS ENUM('POS_TERMINAL', 'KITCHEN_DISPLAY', 'CUSTOMER_DISPLAY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "type" "public"."devices_type_enum" NOT NULL DEFAULT 'POS_TERMINAL'`,
    );
    await queryRunner.query(`ALTER TABLE "devices" ADD "display_for_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "devices" ADD CONSTRAINT "FK_devices_display_for" FOREIGN KEY ("display_for_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devices_display_for" ON "devices" ("display_for_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_devices_display_for"`);
    await queryRunner.query(
      `ALTER TABLE "devices" DROP CONSTRAINT "FK_devices_display_for"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "display_for_id"`,
    );
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."devices_type_enum"`);
  }
}
