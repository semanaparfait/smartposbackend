import { MigrationInterface, QueryRunner } from 'typeorm';

export class Update1781959528703 implements MigrationInterface {
  name = 'Update1781959528703';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_85bc6c26c940e2b0201b4442034" UNIQUE ("bar_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "carts" ALTER COLUMN "total_amount" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ALTER COLUMN "total_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "tax" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_85bc6c26c940e2b0201b4442034"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`,
    );
  }
}
