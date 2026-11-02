import { MigrationInterface, QueryRunner } from 'typeorm';

// Refunds of booking money sit with the payments, marked and with the reason.
export class BookingRefunds1793320000000 implements MigrationInterface {
  name = 'BookingRefunds1793320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_payments"
         ADD "is_refund" boolean NOT NULL DEFAULT false,
         ADD "reason" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_payments"
         DROP COLUMN "reason",
         DROP COLUMN "is_refund"`,
    );
  }
}
