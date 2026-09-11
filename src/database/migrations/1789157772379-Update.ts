import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1789157772379 implements MigrationInterface {
    name = 'Update1789157772379'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'SUPERADMIN'`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('ADMIN', 'OWNER', 'EMPLOYEE')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
    }

}
