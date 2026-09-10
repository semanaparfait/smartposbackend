import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperAdminRole1782000000000 implements MigrationInterface {
  name = 'AddSuperAdminRole1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'SUPERADMIN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM "users" WHERE "role" = 'SUPERADMIN'
        ) THEN
          ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old";
          CREATE TYPE "public"."users_role_enum" AS ENUM ('ADMIN', 'OWNER', 'EMPLOYEE');
          ALTER TABLE "users"
            ALTER COLUMN "role" TYPE "public"."users_role_enum"
            USING "role"::text::"public"."users_role_enum";
          DROP TYPE "public"."users_role_enum_old";
        END IF;
      END $$;
    `);
  }
}