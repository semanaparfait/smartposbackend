import { MigrationInterface, QueryRunner } from 'typeorm';

// Delivery orders: where they go, who takes them, and the owner's delivery fees.
export class Delivery1793410000000 implements MigrationInterface {
  name = 'Delivery1793410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_type_enum" AS ENUM('IN_STORE', 'DELIVERY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_delivery_status_enum" AS ENUM('WAITING', 'ON_THE_WAY', 'DELIVERED', 'NOT_DELIVERED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders"
         ADD "type" "public"."orders_type_enum" NOT NULL DEFAULT 'IN_STORE',
         ADD "delivery_status" "public"."orders_delivery_status_enum",
         ADD "delivery_fee" numeric(12,2) NOT NULL DEFAULT 0,
         ADD "customer_name" character varying(80),
         ADD "customer_phone" character varying(30),
         ADD "delivery_address" text,
         ADD "delivery_area" character varying(60),
         ADD "rider_id" uuid,
         ADD "outside_rider" character varying(100),
         ADD "pay_on_delivery" boolean NOT NULL DEFAULT false,
         ADD "collected_by_id" uuid,
         ADD "sent_at" TIMESTAMP WITH TIME ZONE,
         ADD "delivered_at" TIMESTAMP WITH TIME ZONE,
         ADD "delivery_problem" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders"
         ADD CONSTRAINT "FK_orders_rider" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_orders_collected_by" FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    // The deliveries screen lists open deliveries often.
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_company_delivery" ON "orders" ("company_id", "delivery_status") WHERE "type" = 'DELIVERY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies"
         ADD "delivery_enabled" boolean NOT NULL DEFAULT false,
         ADD "delivery_fee" numeric(12,2) NOT NULL DEFAULT 0,
         ADD "delivery_areas" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "delivery_enabled", DROP COLUMN "delivery_fee", DROP COLUMN "delivery_areas"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_orders_company_delivery"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_rider", DROP CONSTRAINT "FK_orders_collected_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders"
         DROP COLUMN "type", DROP COLUMN "delivery_status", DROP COLUMN "delivery_fee",
         DROP COLUMN "customer_name", DROP COLUMN "customer_phone", DROP COLUMN "delivery_address",
         DROP COLUMN "delivery_area", DROP COLUMN "rider_id", DROP COLUMN "outside_rider",
         DROP COLUMN "pay_on_delivery", DROP COLUMN "collected_by_id", DROP COLUMN "sent_at",
         DROP COLUMN "delivered_at", DROP COLUMN "delivery_problem"`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_type_enum"`);
  }
}
