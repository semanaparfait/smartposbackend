import { MigrationInterface, QueryRunner } from 'typeorm';

// Phone notifications: the phones to send to, and which booking and
// subscription reminders already went out.
export class PushNotifications1793540000000 implements MigrationInterface {
  name = 'PushNotifications1793540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "push_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "token" character varying(255) NOT NULL,
        "platform" character varying(20) NOT NULL DEFAULT 'unknown',
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_push_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_tokens_token" ON "push_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_push_tokens_user" ON "push_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminded_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "billing_reminded_on" date`,
    );
    // Bookings already in the past are not reminded about.
    await queryRunner.query(
      `UPDATE "bookings" SET "reminded_at" = now() WHERE "start_at" < now() - interval '15 minutes'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "billing_reminded_on"`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "reminded_at"`);
    await queryRunner.query(`DROP TABLE "push_tokens"`);
  }
}
