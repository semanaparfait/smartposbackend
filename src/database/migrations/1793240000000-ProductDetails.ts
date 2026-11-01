import { MigrationInterface, QueryRunner } from 'typeorm';

// Stock and kitchen details on products, and a log of every stock change.
export class ProductDetails1793240000000 implements MigrationInterface {
  name = 'ProductDetails1793240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products"
         ADD "track_stock" boolean NOT NULL DEFAULT false,
         ADD "stock_quantity" numeric(12,3) NOT NULL DEFAULT '0',
         ADD "low_stock_level" numeric(12,3),
         ADD "unit" character varying(20) NOT NULL DEFAULT 'Piece',
         ADD "sku" character varying,
         ADD "expiry_date" date,
         ADD "supplier" character varying,
         ADD "send_to_kitchen" boolean NOT NULL DEFAULT false,
         ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_PRODUCT_COMPANY_SKU" UNIQUE ("company_id", "sku")`,
    );

    // Every order reached the kitchen until now. Businesses that may have one keep
    // their products on its screen.
    await queryRunner.query(
      `UPDATE "products" p SET "send_to_kitchen" = true
         FROM "companies" c
        WHERE c."id" = p."company_id"
          AND (c."type" IN ('RESTAURANT', 'BAR', 'HOTEL')
               OR EXISTS (SELECT 1 FROM "devices" d
                           WHERE d."company_id" = c."id"
                             AND d."type" = 'KITCHEN_DISPLAY'))`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_reason_enum" AS ENUM('SALE', 'RESTOCK', 'ADJUSTMENT', 'REFUND')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "change" numeric(12,3) NOT NULL,
         "quantity_after" numeric(12,3) NOT NULL,
         "reason" "public"."stock_movements_reason_enum" NOT NULL,
         "note" character varying,
         "product_id" uuid NOT NULL,
         "order_id" uuid,
         "user_id" uuid,
         CONSTRAINT "PK_stock_movements" PRIMARY KEY ("id"),
         CONSTRAINT "FK_stock_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         CONSTRAINT "FK_stock_movements_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
         CONSTRAINT "FK_stock_movements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_product_created" ON "stock_movements" ("product_id", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_reason_enum"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_PRODUCT_COMPANY_SKU"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products"
         DROP COLUMN "description",
         DROP COLUMN "send_to_kitchen",
         DROP COLUMN "supplier",
         DROP COLUMN "expiry_date",
         DROP COLUMN "sku",
         DROP COLUMN "unit",
         DROP COLUMN "low_stock_level",
         DROP COLUMN "stock_quantity",
         DROP COLUMN "track_stock"`,
    );
  }
}
