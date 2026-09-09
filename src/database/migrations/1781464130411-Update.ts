import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1781464130411 implements MigrationInterface {
    name = 'Update1781464130411'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."files_type_enum" AS ENUM('image', 'video', 'raw', 'auto')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "url" character varying NOT NULL, "type" "public"."files_type_enum" NOT NULL, "mime_type" character varying NOT NULL, "size" integer NOT NULL, "product_id" uuid, "category_id" uuid, CONSTRAINT "REL_6ca4ba01b61dc707723663a7b2" UNIQUE ("category_id"), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product_categories" DROP COLUMN "img"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "img"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_e15089eb0cc4f275cf80636be6a" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_6ca4ba01b61dc707723663a7b25" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_6ca4ba01b61dc707723663a7b25"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_e15089eb0cc4f275cf80636be6a"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ADD "img" character varying`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD "img" character varying`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "public"."files_type_enum"`);
    }

}
