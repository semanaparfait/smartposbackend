import { MigrationInterface, QueryRunner } from 'typeorm';

// Indexes for the lists the screens load most: orders since a date or still
// open, credit sales, booking money by date and each worker's money checks.
export class SpeedIndexes1793530000000 implements MigrationInterface {
  name = 'SpeedIndexes1793530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_company_updated" ON "orders" ("company_id", "updatedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_company_status" ON "orders" ("company_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_credit_order" ON "payments" ("order_id") WHERE "method" = 'CREDIT'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_payments_created" ON "booking_payments" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_money_checks_worker" ON "money_checks" ("worker_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_money_checks_worker"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_booking_payments_created"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_credit_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_company_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_company_updated"`,
    );
  }
}
