import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1780652503287 implements MigrationInterface {
    name = 'Update1780652503287'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_425498b389029c56e66292bfcc6"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "seat_id"`);
        await queryRunner.query(`ALTER TABLE "seats" DROP COLUMN "img"`);
        await queryRunner.query(`ALTER TABLE "carts" ADD "seat_id" uuid`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TYPE "public"."carts_status_enum" RENAME TO "carts_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."carts_status_enum" AS ENUM('ACTIVE', 'CHECKED_OUT')`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" TYPE "public"."carts_status_enum" USING "status"::"text"::"public"."carts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."carts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TYPE "public"."carts_status_enum" RENAME TO "carts_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."carts_status_enum" AS ENUM('ACTIVE', 'CHECKED_OUT')`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" TYPE "public"."carts_status_enum" USING "status"::"text"::"public"."carts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."carts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_7997348b4d1c76342ee26941c47" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_7997348b4d1c76342ee26941c47"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`CREATE TYPE "public"."carts_status_enum_old" AS ENUM('ACTIVE', 'CHECKED_OUT', 'ABANDONED')`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" TYPE "public"."carts_status_enum_old" USING "status"::"text"::"public"."carts_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."carts_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."carts_status_enum_old" RENAME TO "carts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`CREATE TYPE "public"."carts_status_enum_old" AS ENUM('ACTIVE', 'CHECKED_OUT', 'ABANDONED')`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" TYPE "public"."carts_status_enum_old" USING "status"::"text"::"public"."carts_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."carts_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."carts_status_enum_old" RENAME TO "carts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "seat_id"`);
        await queryRunner.query(`ALTER TABLE "seats" ADD "img" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "seat_id" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_425498b389029c56e66292bfcc6" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
