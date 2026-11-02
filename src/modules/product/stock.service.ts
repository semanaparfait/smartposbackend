import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { scopeCompanyId } from 'src/common/utils/company-scope';
import { Order } from '../order/entities/order.entity';
import { Product } from './entities/product.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import {
  StockMovement,
  StockMovementReasonEnum,
} from './entities/stock-movement.entity';

export interface LowStockProduct {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockLevel: number;
}

interface StockChange {
  productId: string;
  change: number;
  reason: StockMovementReasonEnum;
  userId: string;
  orderId?: string;
  note?: string;
}

// Only when this change crossed the level, so the owner hears once rather than on
// every change after it.
function reachedLowLevel(
  level: number | null,
  quantityAfter: number,
  removed: number,
) {
  return (
    level !== null && quantityAfter <= level && quantityAfter + removed > level
  );
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,

    @InjectRepository(RecipeItem)
    private readonly recipeRepo: Repository<RecipeItem>,
  ) {}

  // Added in the database, not read and re-saved, so two tills selling at once
  // can't overwrite each other. Stock may go below zero: a shop's count is often
  // slightly off, and refusing would stop a real sale.
  async apply(manager: EntityManager, change: StockChange) {
    const [rows]: [
      {
        name: string;
        unit: string;
        stock_quantity: string;
        low_stock_level: string | null;
      }[],
      number,
    ] = await manager.query(
      `UPDATE products SET stock_quantity = stock_quantity + $1
        WHERE id = $2
        RETURNING name, unit, stock_quantity, low_stock_level`,
      [change.change, change.productId],
    );

    const row = rows[0];
    const quantityAfter = Number(row.stock_quantity);

    await manager.insert(StockMovement, {
      product: { id: change.productId },
      change: change.change,
      quantityAfter,
      reason: change.reason,
      note: change.note ?? null,
      order: change.orderId ? { id: change.orderId } : null,
      user: { id: change.userId },
    });

    return {
      name: row.name,
      unit: row.unit,
      quantityAfter,
      lowStockLevel:
        row.low_stock_level === null ? null : Number(row.low_stock_level),
    };
  }

  // Takes a paid order's items out of stock, and what their recipes used.
  // `order.items` must include their products. Returns the products this sale took
  // to their alert level, so the owner hears once rather than on every sale after it.
  async recordSale(manager: EntityManager, order: Order, userId: string) {
    const quantities = new Map<string, number>();
    const usedIn = new Map<string, string[]>();
    const add = (productId: string, amount: number) =>
      quantities.set(
        productId,
        // Thousandths, as stored: 0.1 + 0.2 must not become 0.30000000000000004.
        Math.round(((quantities.get(productId) ?? 0) + amount) * 1000) / 1000,
      );

    const recipes = await manager.find(RecipeItem, {
      where: { product: { id: In(order.items.map((i) => i.product.id)) } },
      relations: { product: true, ingredient: true },
    });

    await this.saveUnitCosts(manager, order, recipes);

    for (const item of order.items) {
      if (item.product.trackStock) add(item.product.id, item.quantity);

      for (const line of recipes) {
        if (line.product.id !== item.product.id) continue;
        if (!line.ingredient.trackStock) continue;

        add(line.ingredient.id, Number(line.quantity) * item.quantity);
        usedIn.set(line.ingredient.id, [
          ...(usedIn.get(line.ingredient.id) ?? []),
          `${item.quantity} × ${item.product.name}`,
        ]);
      }
    }

    const low: LowStockProduct[] = [];

    // Always in the same order, so two sales of the same products can't deadlock.
    for (const productId of [...quantities.keys()].sort()) {
      const sold = quantities.get(productId)!;
      const { name, unit, quantityAfter, lowStockLevel } = await this.apply(
        manager,
        {
          productId,
          change: -sold,
          reason: StockMovementReasonEnum.SALE,
          userId,
          orderId: order.id,
          note: usedIn.has(productId)
            ? `Used in ${usedIn.get(productId)!.join(', ')}`.slice(0, 255)
            : undefined,
        },
      );

      if (reachedLowLevel(lowStockLevel, quantityAfter, sold))
        low.push({
          id: productId,
          name,
          unit,
          stockQuantity: quantityAfter,
          lowStockLevel: lowStockLevel!,
        });
    }

    return low;
  }

  // Stock lost to spoilage, spills and the like. Returns the product if this took
  // it to its alert level.
  async recordWaste(
    manager: EntityManager,
    productId: string,
    quantity: number,
    reason: string,
    userId: string,
  ): Promise<LowStockProduct[]> {
    const { name, unit, quantityAfter, lowStockLevel } = await this.apply(
      manager,
      {
        productId,
        change: -quantity,
        reason: StockMovementReasonEnum.WASTE,
        userId,
        note: reason,
      },
    );

    return reachedLowLevel(lowStockLevel, quantityAfter, quantity)
      ? [
          {
            id: productId,
            name,
            unit,
            stockQuantity: quantityAfter,
            lowStockLevel: lowStockLevel!,
          },
        ]
      : [];
  }

  // One unit's cost at this moment: what its recipe uses, or its buying price.
  // Written in one statement, and outside the audit history: it is bookkeeping on
  // an order the history already records.
  private async saveUnitCosts(
    manager: EntityManager,
    order: Order,
    recipes: RecipeItem[],
  ) {
    const costs = order.items.map((item) => {
      const lines = recipes.filter((l) => l.product.id === item.product.id);
      const cost = lines.length
        ? lines.reduce(
            (sum, l) =>
              sum + Number(l.quantity) * Number(l.ingredient.buyingPrice),
            0,
          )
        : Number(item.product.buyingPrice);

      return Math.round(cost * 10000) / 10000;
    });

    await manager.query(
      `UPDATE items i SET unit_cost = c.cost
         FROM unnest($1::uuid[], $2::numeric[]) AS c(id, cost)
        WHERE i.id = c.id`,
      [order.items.map((item) => item.id), costs],
    );
  }

  // Sets canMake on each product: how many its stock-tracked ingredients allow.
  // The scarcest ingredient decides, and it is never below zero.
  async attachCanMake(products: Product[]) {
    if (!products.length) return products;

    const lines = await this.recipeRepo.find({
      where: {
        product: { id: In(products.map((p) => p.id)) },
        ingredient: { trackStock: true },
      },
      select: {
        id: true,
        quantity: true,
        product: { id: true },
        ingredient: { id: true, stockQuantity: true },
      },
      relations: { product: true, ingredient: true },
    });

    for (const product of products) {
      const own = lines.filter((l) => l.product.id === product.id);

      // In thousandths, as stored: 0.3 / 0.1 must give 3, not 2.
      product.canMake = own.length
        ? Math.max(
            0,
            Math.min(
              ...own.map((l) =>
                Math.floor(
                  Math.round(Number(l.ingredient.stockQuantity) * 1000) /
                    Math.round(Number(l.quantity) * 1000),
                ),
              ),
            ),
          )
        : null;
    }

    return products;
  }

  // Active, stock-tracked products at or below their alert level, emptiest first.
  async getLowStock(user: Payload, companyId?: string) {
    const company = scopeCompanyId(user, companyId);
    const query = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.trackStock = true')
      .andWhere('p.active = true')
      .andWhere('p.stockQuantity <= p.lowStockLevel')
      .orderBy('p.stockQuantity', 'ASC');

    if (company) query.andWhere('p.company_id = :company', { company });

    return query.getMany();
  }

  // Active products expiring within `days`, including those already expired,
  // soonest first.
  async getExpiring(user: Payload, days: number, companyId?: string) {
    const company = scopeCompanyId(user, companyId);
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const query = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.active = true')
      .andWhere('p.expiryDate <= :until', { until })
      .orderBy('p.expiryDate', 'ASC');

    if (company) query.andWhere('p.company_id = :company', { company });

    return query.getMany();
  }

  // For each ingredient over the last `days`: how much went into sales, was wasted
  // and arrived. Valued at today's cost, so it shows the size of each, not past spend.
  async getIngredientUsage(user: Payload, days: number, companyId?: string) {
    const company = scopeCompanyId(user, companyId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows: {
      id: string;
      name: string;
      unit: string;
      cost: string;
      used: string;
      wasted: string;
      received: string;
    }[] = await this.movementRepo.query(
      `SELECT p.id, p.name, p.unit, p.buying_price AS cost,
              COALESCE(SUM(-m.change) FILTER (WHERE m.reason = 'SALE'), 0) AS used,
              COALESCE(SUM(-m.change) FILTER (WHERE m.reason = 'WASTE'), 0) AS wasted,
              COALESCE(SUM(m.change) FILTER (WHERE m.reason = 'RESTOCK'), 0) AS received
         FROM products p
         LEFT JOIN stock_movements m
           ON m.product_id = p.id AND m."createdAt" >= $1
        WHERE p.is_ingredient = true
          AND ($2::uuid IS NULL OR p.company_id = $2)
        GROUP BY p.id
        ORDER BY used DESC, p.name ASC`,
      [since, company ?? null],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      cost: Number(row.cost),
      used: Number(row.used),
      wasted: Number(row.wasted),
      received: Number(row.received),
    }));
  }

  async getMovements(productId: string, page = 1, limit = 50) {
    const [data, total] = await this.movementRepo.findAndCount({
      where: { product: { id: productId } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total, page, limit };
  }
}
