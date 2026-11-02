import { MigrationInterface, QueryRunner } from 'typeorm';

// Services sold by time or by booking (rooms, halls, pool tables, tickets, rentals),
// their bookable units, bookings and the money taken for them. Bookings are paid
// on their own, apart from orders.
export class Services1793310000000 implements MigrationInterface {
  name = 'Services1793310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const audit = `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb`;

    await queryRunner.query(
      `CREATE TYPE "public"."services_kind_enum" AS ENUM('ROOM', 'SPACE', 'ACTIVITY', 'TICKET', 'RENTAL', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."services_price_unit_enum" AS ENUM('HOUR', 'NIGHT', 'DAY', 'SESSION', 'PERSON', 'FIXED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_units_status_enum" AS ENUM('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_payments_method_enum" AS ENUM('CASH', 'MOMO', 'CARD', 'CREDIT')`,
    );

    await queryRunner.query(
      `CREATE TABLE "services" (${audit},
        "name" character varying(120) NOT NULL,
        "description" text,
        "image_url" character varying,
        "kind" "public"."services_kind_enum" NOT NULL,
        "price_unit" "public"."services_price_unit_enum" NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "capacity" integer,
        "deposit" numeric(12,2) NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "company_id" uuid NOT NULL,
        CONSTRAINT "PK_services" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_units" (${audit},
        "name" character varying(60) NOT NULL,
        "status" "public"."service_units_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "service_id" uuid NOT NULL,
        CONSTRAINT "PK_service_units" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" (${audit},
        "code" character varying(12) NOT NULL,
        "customer_name" character varying(120) NOT NULL,
        "customer_phone" character varying(30),
        "people" integer NOT NULL DEFAULT 1,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE,
        "checked_in_at" TIMESTAMP WITH TIME ZONE,
        "checked_out_at" TIMESTAMP WITH TIME ZONE,
        "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'RESERVED',
        "price_unit" "public"."services_price_unit_enum" NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL,
        "note" text,
        "cancel_reason" character varying(255),
        "company_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "unit_id" uuid,
        "user_id" uuid,
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_payments" (${audit},
        "method" "public"."booking_payments_method_enum" NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "booking_id" uuid NOT NULL,
        "user_id" uuid,
        CONSTRAINT "PK_booking_payments" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_services_company" ON "services" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_units_service" ON "service_units" ("service_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_company_start" ON "bookings" ("company_id", "start_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_unit" ON "bookings" ("unit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_payments_booking" ON "booking_payments" ("booking_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "services" ADD CONSTRAINT "FK_services_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_units" ADD CONSTRAINT "FK_service_units_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"
         ADD CONSTRAINT "FK_bookings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_bookings_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_bookings_unit" FOREIGN KEY ("unit_id") REFERENCES "service_units"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_payments"
         ADD CONSTRAINT "FK_booking_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         ADD CONSTRAINT "FK_booking_payments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "booking_payments"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "service_units"`);
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(
      `DROP TYPE "public"."booking_payments_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."service_units_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."services_price_unit_enum"`);
    await queryRunner.query(`DROP TYPE "public"."services_kind_enum"`);
  }
}
