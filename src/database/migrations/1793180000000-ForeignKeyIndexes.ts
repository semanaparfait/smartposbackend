import { MigrationInterface, QueryRunner } from 'typeorm';

// Postgres doesn't index foreign keys on its own, so every "items of this cart" or
// "orders of this company" read the whole table, and removing a cart at checkout
// scanned all items ever sold (items.cart_id is ON DELETE SET NULL). These keep
// those lookups fast as sales grow. Matching @Index decorators are on the entities.
const INDEXES: [name: string, table: string, columns: string][] = [
  ['IDX_items_cart', 'items', '"cart_id"'],
  ['IDX_items_order', 'items', '"order_id"'],
  ['IDX_items_product', 'items', '"product_id"'],
  ['IDX_carts_company_status', 'carts', '"company_id", "status"'],
  ['IDX_carts_user', 'carts', '"user_id"'],
  ['IDX_orders_company_created', 'orders', '"company_id", "createdAt"'],
  ['IDX_orders_user', 'orders', '"user_id"'],
  ['IDX_payments_order', 'payments', '"order_id"'],
  ['IDX_files_product', 'files', '"product_id"'],
  ['IDX_products_company', 'products', '"company_id"'],
];

export class ForeignKeyIndexes1793180000000 implements MigrationInterface {
  name = 'ForeignKeyIndexes1793180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, table, columns] of INDEXES) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" (${columns})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of INDEXES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
  }
}
