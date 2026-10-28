import { MigrationInterface, QueryRunner } from 'typeorm';

// Existing roles keep NULL permissions, which allows everything (as the app expects),
// so nobody loses access until an owner sets the role's permissions.
export class RolePermissions1793170000000 implements MigrationInterface {
  name = 'RolePermissions1793170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee_roles" ADD "permissions" text array`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee_roles" DROP COLUMN "permissions"`,
    );
  }
}
