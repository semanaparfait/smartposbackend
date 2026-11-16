import { MigrationInterface, QueryRunner } from 'typeorm';
import { placeInLayout } from '../../modules/venue/venue.place';

// Orders that are on a table right now get that table written on them.
// (Older paid orders can't be filled in: tables forgot them when freed.)
export class OrderTableBackfill1793580000000 implements MigrationInterface {
  name = 'OrderTableBackfill1793580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    type Row = { order_id: string; table_id: string; layout: unknown };
    const rows = (await queryRunner.query(
      `SELECT t.order_id, t.table_id, l.layout
         FROM venue_tables t
         JOIN orders o ON o.id = t.order_id
         LEFT JOIN venue_layouts l ON l.company_id = t.company_id
        WHERE t.order_id IS NOT NULL AND o.table_id IS NULL`,
    )) as Row[];
    for (const r of rows) {
      const place = placeInLayout(r.layout, r.table_id);
      await queryRunner.query(
        `UPDATE orders
            SET table_id = $2, table_name = $3, table_kind = $4, table_area = $5
          WHERE id = $1`,
        [
          r.order_id,
          r.table_id.slice(0, 64),
          place?.name ?? null,
          place?.kind ?? 'Table',
          place?.area ?? null,
        ],
      );
    }
  }

  public async down(): Promise<void> {
    // Nothing to undo: the columns are dropped by OrderTable's down.
  }
}
