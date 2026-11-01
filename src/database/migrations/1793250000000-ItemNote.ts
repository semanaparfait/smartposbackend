import { MigrationInterface, QueryRunner } from 'typeorm';

// A note on one line of a sale, e.g. "No onions", shown on the kitchen display.
export class ItemNote1793250000000 implements MigrationInterface {
  name = 'ItemNote1793250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "items" ADD "note" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "note"`);
  }
}
