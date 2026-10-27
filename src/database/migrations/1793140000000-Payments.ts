import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments1793140000000 implements MigrationInterface {
  name = 'Payments1793140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payments_method_enum" AS ENUM('CASH', 'MOMO', 'CARD', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdBy" jsonb, "updatedBy" jsonb, "method" "public"."payments_method_enum" NOT NULL, "amount" numeric NOT NULL, "credit_owner_name" character varying, "credit_owner_phone" character varying, "taken_by" character varying, "order_id" uuid NOT NULL, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_order"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
  }
}
