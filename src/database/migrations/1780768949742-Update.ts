import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1780768949742 implements MigrationInterface {
    name = 'Update1780768949742'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "tax" numeric NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "total"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "total" numeric NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "note" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "total_price"`);
        await queryRunner.query(`ALTER TABLE "items" ADD "total_price" numeric NOT NULL`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "note" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "note" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "total_price"`);
        await queryRunner.query(`ALTER TABLE "items" ADD "total_price" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "note" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "total"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "total" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "tax" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric(12,2)`);
    }

}
