import { MigrationInterface, QueryRunner } from 'typeorm';

// Whether the money of each booking payment (or refund) was checked by someone
// allowed to verify takings: confirmed received, or reported as not received.
export class BookingPaymentReceipts1793330000000 implements MigrationInterface {
  name = 'BookingPaymentReceipts1793330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."booking_payments_receipt_enum" AS ENUM('PENDING', 'CONFIRMED', 'MISSING')`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_payments"
         ADD "receipt" "public"."booking_payments_receipt_enum" NOT NULL DEFAULT 'PENDING',
         ADD "receipt_note" character varying(255),
         ADD "receipt_checked_at" TIMESTAMP WITH TIME ZONE,
         ADD "receipt_checked_by_id" uuid,
         ADD CONSTRAINT "FK_booking_payments_checked_by" FOREIGN KEY ("receipt_checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_payments_receipt" ON "booking_payments" ("receipt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_booking_payments_receipt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_payments"
         DROP CONSTRAINT "FK_booking_payments_checked_by",
         DROP COLUMN "receipt_checked_by_id",
         DROP COLUMN "receipt_checked_at",
         DROP COLUMN "receipt_note",
         DROP COLUMN "receipt"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."booking_payments_receipt_enum"`,
    );
  }
}
