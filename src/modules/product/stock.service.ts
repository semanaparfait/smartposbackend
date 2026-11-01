import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { scopeCompanyId } from 'src/common/utils/company-scope';
import { Order } from '../order/entities/order.entity';
import { Product } from './entities/product.entity';
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

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
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

  // Takes a paid order's items out of stock. `order.items` must include their
  // products. Returns the products this sale took to their alert level, so the
  // owner hears once rather than on every sale after it.
  async recordSale(manager: EntityManager, order: Order, userId: string) {
    const quantities = new Map<string, number>();

    for (const item of order.items) {
      if (item.product.trackStock)
        quantities.set(
          item.product.id,
          (quantities.get(item.product.id) ?? 0) + item.quantity,
        );
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
        },
      );

      if (
        lowStockLevel !== null &&
        quantityAfter <= lowStockLevel &&
        quantityAfter + sold > lowStockLevel
      )
        low.push({
          id: productId,
          name,
          unit,
          stockQuantity: quantityAfter,
          lowStockLevel,
        });
    }

    return low;
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
