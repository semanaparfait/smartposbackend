import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1790591112009 implements MigrationInterface {
    name = 'Update1790591112009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_USER_COMPANY_EMAIL"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_USER_COMPANY_EMAIL" UNIQUE ("company_id", "email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_USER_COMPANY_EMAIL"`);
        await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_USER_COMPANY_EMAIL" UNIQUE ("email", "company_id")`);

    }

}
