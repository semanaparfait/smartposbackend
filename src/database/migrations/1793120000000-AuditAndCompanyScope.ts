import { MigrationInterface, QueryRunner } from 'typeorm';

// Written by hand: TypeORM's generator crashes when replacing the single-column unique
// constraints on products/product_categories with per-company ones.
//
// 1. createdBy / updatedBy audit columns on every table, plus the audit_logs history table.
// 2. Device secret for authenticated heartbeats.
// 3. Company ownership for product categories, products, room types, carts and orders,
//    backfilled from existing data (see backfill below), and names/barcodes made unique
//    per company instead of globally.
const AUDITED_TABLES = [
  'carts',
  'companies',
  'device_activities',
  'devices',
  'employee_roles',
  'employees',
  'files',
  'floor_maps',
  'items',
  'orders',
  'product_categories',
  'products',
  'room_types',
  'rooms',
  'seats',
  'users',
];

const COMPANY_OWNED_TABLES = [
  'product_categories',
  'products',
  'room_types',
  'carts',
  'orders',
];

export class AuditAndCompanyScope1793120000000 implements MigrationInterface {
  name = 'AuditAndCompanyScope1793120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- audit columns + history -------------------------------------------------
    for (const table of AUDITED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "createdBy" jsonb, ADD "updatedBy" jsonb`,
      );
    }

    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "action" "public"."audit_logs_action_enum" NOT NULL, "entity_name" character varying NOT NULL, "entity_id" character varying, "changes" jsonb, "actor" jsonb, "actor_id" uuid, "company_id" uuid, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id")`,
    );

    // --- device secret -----------------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "devices" ADD "secret_hash" character varying`,
    );

    // --- company ownership -------------------------------------------------------
    for (const table of COMPANY_OWNED_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD "company_id" uuid`);
    }

    // Orders belong to the company of the user who placed them.
    await queryRunner.query(
      `UPDATE "orders" o SET "company_id" = u."company_id" FROM "users" u WHERE o."user_id" = u."id"`,
    );

    // Products belong to the company that sold them most.
    await queryRunner.query(`
      UPDATE "products" p SET "company_id" = x."company_id"
      FROM (
        SELECT DISTINCT ON (i."product_id") i."product_id", o."company_id"
        FROM "items" i JOIN "orders" o ON o."id" = i."order_id"
        WHERE o."company_id" IS NOT NULL
        GROUP BY i."product_id", o."company_id"
        ORDER BY i."product_id", COUNT(*) DESC
      ) x
      WHERE p."id" = x."product_id"`);

    // Categories belong to the company of most of their products.
    await queryRunner.query(`
      UPDATE "product_categories" pc SET "company_id" = x."company_id"
      FROM (
        SELECT DISTINCT ON ("category_id") "category_id", "company_id"
        FROM "products"
        WHERE "company_id" IS NOT NULL AND "category_id" IS NOT NULL
        GROUP BY "category_id", "company_id"
        ORDER BY "category_id", COUNT(*) DESC
      ) x
      WHERE pc."id" = x."category_id"`);

    // Carts belong to the company of their seat.
    await queryRunner.query(`
      UPDATE "carts" c SET "company_id" = fm."company_id"
      FROM "seats" s
      JOIN "rooms" r ON r."id" = s."room_id"
      JOIN "floor_maps" fm ON fm."id" = r."floor_map_id"
      WHERE c."seat_id" = s."id"`);

    // Anything still unassigned goes to the main company (most products, else oldest).
    for (const table of COMPANY_OWNED_TABLES) {
      await queryRunner.query(`
        UPDATE "${table}" SET "company_id" = COALESCE(
          (SELECT "company_id" FROM "products" WHERE "company_id" IS NOT NULL
             GROUP BY "company_id" ORDER BY COUNT(*) DESC LIMIT 1),
          (SELECT "id" FROM "companies" ORDER BY "createdAt" LIMIT 1)
        )
        WHERE "company_id" IS NULL`);
    }

    // Fails loudly (rolling everything back) if a row could not be assigned.
    for (const table of COMPANY_OWNED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "company_id" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Names and barcodes only need to be unique within a company.
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_4c9fb58de893725258746385e16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_85bc6c26c940e2b0201b4442034"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "UQ_CATEGORY_COMPANY_NAME" UNIQUE ("company_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_PRODUCT_COMPANY_NAME" UNIQUE ("company_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_PRODUCT_COMPANY_BARCODE" UNIQUE ("company_id", "bar_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_PRODUCT_COMPANY_BARCODE"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_PRODUCT_COMPANY_NAME"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "UQ_CATEGORY_COMPANY_NAME"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_85bc6c26c940e2b0201b4442034" UNIQUE ("bar_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf" UNIQUE ("name")`,
    );

    for (const table of COMPANY_OWNED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_company"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "company_id"`,
      );
    }

    await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "secret_hash"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_entity"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_company_created"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_actor_id"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);

    for (const table of AUDITED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "createdBy", DROP COLUMN "updatedBy"`,
      );
    }
  }
}
