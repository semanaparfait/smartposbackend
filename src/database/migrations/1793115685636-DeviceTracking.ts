import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceTracking1793115685636 implements MigrationInterface {
  name = 'DeviceTracking1793115685636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "device_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "action" character varying NOT NULL, "method" character varying, "path" character varying, "status_code" integer, "device_id" uuid, "user_id" uuid, CONSTRAINT "PK_30b412a9f62aab1422e27d6cd74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aac9eea717d3cdf450974e47ee" ON "device_activities"  ("device_id", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "last_seen_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "last_login_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "last_activity" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "last_activity_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "devices" ADD "current_user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "device_activities" ADD CONSTRAINT "FK_df35d621e18a8863f29c2c6a0e3" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_activities" ADD CONSTRAINT "FK_fa415f4088e4d28857e2f496b1b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" ADD CONSTRAINT "FK_cb2aa4b3345828c4531c159dd37" FOREIGN KEY ("current_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "devices" DROP CONSTRAINT "FK_cb2aa4b3345828c4531c159dd37"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_activities" DROP CONSTRAINT "FK_fa415f4088e4d28857e2f496b1b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_activities" DROP CONSTRAINT "FK_df35d621e18a8863f29c2c6a0e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "current_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "last_activity_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "last_activity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP COLUMN "last_login_at"`,
    );
    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "last_seen_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aac9eea717d3cdf450974e47ee"`,
    );
    await queryRunner.query(`DROP TABLE "device_activities"`);
  }
}
