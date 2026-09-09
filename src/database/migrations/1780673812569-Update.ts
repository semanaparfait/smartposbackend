import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1780673812569 implements MigrationInterface {
    name = 'Update1780673812569'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "phone" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "phone" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_af5344075f113492cf1e52017f" CHECK (("email" IS NOT NULL OR "phone" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "CHK_1f8b184d0a5e14c7e4c7b86880" CHECK (("email" IS NOT NULL OR "phone" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_USER_COMPANY_PHONE" UNIQUE ("company_id", "phone")`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_USER_COMPANY_EMAIL" UNIQUE ("company_id", "email")`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "UQ_EMPLOYEE_COMPANY_PHONE" UNIQUE ("company_id", "phone")`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "UQ_EMPLOYEE_COMPANY_EMAIL" UNIQUE ("company_id", "email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "UQ_EMPLOYEE_COMPANY_EMAIL"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "UQ_EMPLOYEE_COMPANY_PHONE"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_USER_COMPANY_EMAIL"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_USER_COMPANY_PHONE"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "CHK_1f8b184d0a5e14c7e4c7b86880"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "CHK_af5344075f113492cf1e52017f"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
    }

}
