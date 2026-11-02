import { MigrationInterface, QueryRunner } from 'typeorm';

// Ingredients are stock that is never sold; a recipe says how much of each one a
// product uses, so selling it takes them out of stock.
export class Recipes1793270000000 implements MigrationInterface {
  name = 'Recipes1793270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "is_ingredient" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipe_items" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "quantity" numeric(12,3) NOT NULL,
         "product_id" uuid NOT NULL,
         "ingredient_id" uuid NOT NULL,
         CONSTRAINT "PK_recipe_items" PRIMARY KEY ("id"),
         CONSTRAINT "UQ_RECIPE_ITEM" UNIQUE ("product_id", "ingredient_id"),
         CONSTRAINT "FK_recipe_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
         CONSTRAINT "FK_recipe_items_ingredient" FOREIGN KEY ("ingredient_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recipe_items_ingredient" ON "recipe_items" ("ingredient_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recipe_items"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "is_ingredient"`);
  }
}
