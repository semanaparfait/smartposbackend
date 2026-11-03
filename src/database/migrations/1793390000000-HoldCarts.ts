import { MigrationInterface, QueryRunner } from 'typeorm';

// Sales put on hold for a customer, and how long the owner lets one wait.
export class HoldCarts1793390000000 implements MigrationInterface {
  name = 'HoldCarts1793390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."carts_status_enum" ADD VALUE IF NOT EXISTS 'HELD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts"
         ADD "held_for" character varying(60),
         ADD "held_at" TIMESTAMP WITH TIME ZONE,
         ADD "hold_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "max_hold_minutes" integer NOT NULL DEFAULT 60`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "max_hold_minutes"`,
    );
    // Held sales go back to the till; Postgres can't drop an enum value.
    await queryRunner.query(
      `UPDATE "carts" SET "status" = 'ACTIVE' WHERE "status" = 'HELD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP COLUMN "held_for", DROP COLUMN "held_at", DROP COLUMN "hold_until"`,
    );
  }
}
