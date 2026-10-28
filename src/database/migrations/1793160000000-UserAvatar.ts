import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1793160000000 implements MigrationInterface {
  name = 'UserAvatar1793160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "files" ADD "user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "UQ_a7435dbb7583938d5e7d1376041" UNIQUE ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_files_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_files_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "UQ_a7435dbb7583938d5e7d1376041"`,
    );
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "user_id"`);
  }
}
