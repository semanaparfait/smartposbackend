import { MigrationInterface, QueryRunner } from 'typeorm';

export class CartOwner1793130000000 implements MigrationInterface {
  name = 'CartOwner1793130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "carts" ADD "user_id" uuid`);

    // Existing carts belong to whoever created them, when that was recorded.
    await queryRunner.query(
      `UPDATE "carts" c SET "user_id" = u."id" FROM "users" u WHERE u."id"::text = c."createdBy"->>'id'`,
    );

    await queryRunner.query(
      `ALTER TABLE "carts" ADD CONSTRAINT "FK_carts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_user"`,
    );
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "user_id"`);
  }
}
