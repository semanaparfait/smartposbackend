import { MigrationInterface, QueryRunner } from 'typeorm';

// Per-employee adjustments on top of their role's permissions.
export class EmployeePermissionOverrides1793190000000 implements MigrationInterface {
  name = 'EmployeePermissionOverrides1793190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "extra_permissions" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "removed_permissions" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "removed_permissions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN "extra_permissions"`,
    );
  }
}
