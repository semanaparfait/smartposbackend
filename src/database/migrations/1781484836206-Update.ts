import { MigrationInterface, QueryRunner } from 'typeorm';

export class Update1781484836206 implements MigrationInterface {
  name = 'Update1781484836206';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `ALTER TABLE "product_categories" ADD CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`,
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
      `ALTER TABLE "products" ALTER COLUMN "selling_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "buying_price" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_4c9fb58de893725258746385e16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "UQ_a75bfadcd8291a0538ab7abfdcf"`,
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
  }
}
