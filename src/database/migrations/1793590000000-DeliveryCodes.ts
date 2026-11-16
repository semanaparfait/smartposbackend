import { MigrationInterface, QueryRunner } from 'typeorm';

// Delivery codes: the customer gets a code the rider needs to finish a
// delivery, where the rider was, and each customer's usual place.
export class DeliveryCodes1793590000000 implements MigrationInterface {
  name = 'DeliveryCodes1793590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "delivery_codes" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD "delivery_code_required" boolean NOT NULL DEFAULT false,
        ADD "delivery_code" character varying(8),
        ADD "delivery_code_tries" integer NOT NULL DEFAULT 0,
        ADD "delivery_track_token" character varying(48),
        ADD "notify_by" character varying(10),
        ADD "customer_language" character varying(4),
        ADD "code_sent_at" TIMESTAMP WITH TIME ZONE,
        ADD "arrived_at" TIMESTAMP WITH TIME ZONE,
        ADD "arrived_position" jsonb,
        ADD "delivered_position" jsonb,
        ADD "delivery_proof" jsonb
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_orders_delivery_track_token" ON "orders" ("delivery_track_token")`,
    );

    await queryRunner.query(`
      CREATE TABLE "delivery_pins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdBy" jsonb,
        "updatedBy" jsonb,
        "company_id" uuid NOT NULL,
        "phone" character varying(20) NOT NULL,
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        CONSTRAINT "PK_delivery_pins" PRIMARY KEY ("id"),
        CONSTRAINT "FK_delivery_pins_company" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_delivery_pins_company_phone" ON "delivery_pins" ("company_id", "phone")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delivery_pins"`);
    await queryRunner.query(`DROP INDEX "UQ_orders_delivery_track_token"`);
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN "delivery_proof",
        DROP COLUMN "delivered_position",
        DROP COLUMN "arrived_position",
        DROP COLUMN "arrived_at",
        DROP COLUMN "code_sent_at",
        DROP COLUMN "customer_language",
        DROP COLUMN "notify_by",
        DROP COLUMN "delivery_track_token",
        DROP COLUMN "delivery_code_tries",
        DROP COLUMN "delivery_code",
        DROP COLUMN "delivery_code_required"
    `);
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "delivery_codes"`,
    );
  }
}
