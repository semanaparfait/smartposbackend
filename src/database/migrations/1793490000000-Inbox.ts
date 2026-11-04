import { MigrationInterface, QueryRunner } from 'typeorm';

// Installation requests, contact messages and password help sent from outside,
// for the super admin's inbox.
export class Inbox1793490000000 implements MigrationInterface {
  name = 'Inbox1793490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."inbox_items_kind_enum" AS ENUM('INSTALLATION', 'CONTACT', 'PASSWORD_HELP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inbox_items_status_enum" AS ENUM('NEW', 'IN_PROGRESS', 'DONE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inbox_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb,
        "kind" "public"."inbox_items_kind_enum" NOT NULL,
        "status" "public"."inbox_items_status_enum" NOT NULL DEFAULT 'NEW',
        "name" character varying(120) NOT NULL,
        "email" character varying(160),
        "phone" character varying(40),
        "subject" character varying(160) NOT NULL,
        "message" text,
        "details" jsonb NOT NULL DEFAULT '{}',
        "admin_note" text,
        "handled_by_name" character varying(120),
        "handled_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_inbox_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inbox_items_status" ON "inbox_items" ("status", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inbox_items"`);
    await queryRunner.query(`DROP TYPE "public"."inbox_items_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."inbox_items_kind_enum"`);
  }
}
