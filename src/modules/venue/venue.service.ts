import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { targetCompanyId } from 'src/common/utils/company-scope';
import { Order } from '../order/entities/order.entity';
import { UserRole } from '../user/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { VenueEvent } from './venue.events';
import { VenueLayout, VenueTable } from './venue.entity';
import { SaveLayoutDto, UpdateTableDto } from './venue.dto';

// The order summary shown on a table, without loading all its items.
export interface TableOrder {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
}

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(VenueLayout)
    private readonly layouts: Repository<VenueLayout>,
    @InjectRepository(VenueTable)
    private readonly tables: Repository<VenueTable>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    private readonly realtime: RealtimeService,
  ) {}

  async layout(user: Payload, companyId?: string) {
    const company = targetCompanyId(user, companyId);
    const row = await this.layouts.findOne({
      where: { company: { id: company } },
    });
    return row
      ? {
          layout: row.layout,
          version: row.version,
          savedAt: row.updatedAt,
          savedByName: row.savedByName,
        }
      : { layout: null, version: 0, savedAt: null, savedByName: null };
  }

  async saveLayout(user: Payload, dto: SaveLayoutDto, companyId?: string) {
    const company = targetCompanyId(user, companyId);
    const floors = (dto.layout as { floors?: unknown }).floors;
    if (!Array.isArray(floors) || !floors.length)
      throw new BadRequestException('The map needs at least one floor');

    let row = await this.layouts.findOne({
      where: { company: { id: company } },
    });

    if (row && dto.version !== undefined && dto.version !== row.version)
      throw new ConflictException(
        `${row.savedByName ?? 'Someone'} changed the map while you were editing. Open it again to get their changes`,
      );

    if (row) {
      row.layout = dto.layout;
      row.version += 1;
      row.savedByName = user.name ?? null;
    } else {
      row = this.layouts.create({
        company: { id: company },
        layout: dto.layout,
        version: 1,
        savedByName: user.name ?? null,
      });
    }
    row = await this.layouts.save(row);

    this.realtime.toStaff(company, VenueEvent.LAYOUT_SAVED, {
      version: row.version,
      savedByName: row.savedByName,
    });

    return {
      layout: row.layout,
      version: row.version,
      savedAt: row.updatedAt,
      savedByName: row.savedByName,
    };
  }

  // Every table that isn't simply free, with the order served there.
  async listTables(user: Payload, companyId?: string) {
    const company = targetCompanyId(user, companyId);
    const rows = await this.tables.find({
      where: { company: { id: company }, status: Not('available') },
    });
    const orders = await this.ordersOf(rows);
    return rows.map((r) => this.view(r, orders));
  }

  async updateTable(
    user: Payload,
    tableId: string,
    dto: UpdateTableDto,
    companyId?: string,
  ) {
    const company = targetCompanyId(user, companyId);
    let row = await this.tables.findOne({
      where: { company: { id: company }, tableId },
    });
    if (!row)
      row = this.tables.create({
        company: { id: company },
        tableId,
        status: 'available',
        orderId: null,
        booking: null,
        since: new Date(),
      });

    const before = row.status;

    // One worker serves a taken table; only they or an owner change it.
    if (
      row.status === 'occupied' &&
      row.servedById &&
      row.servedById !== user.sub &&
      user.role === UserRole.EMPLOYEE
    )
      throw new ForbiddenException(
        `${row.servedByName ?? 'Another worker'} is serving this table. Only they can change it`,
      );

    if (dto.orderId) {
      const order = await this.orders.findOne({
        where: { id: dto.orderId, company: { id: company } },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      const elsewhere = await this.tables.findOne({
        where: {
          company: { id: company },
          orderId: dto.orderId,
          tableId: Not(tableId),
        },
      });
      if (elsewhere)
        throw new ConflictException('This order is already at another table');

      row.orderId = dto.orderId;
      row.status = 'occupied';
      // The guests who booked have arrived.
      row.booking = null;
      row.servedById = user.sub;
      row.servedByName = user.name ?? null;
    } else if (dto.orderId === null) {
      row.orderId = null;
    }

    if (dto.booking) {
      row.booking = {
        name: dto.booking.name.trim(),
        phone: dto.booking.phone?.trim() || null,
        at: new Date(dto.booking.at).toISOString(),
        guests: dto.booking.guests ?? null,
        note: dto.booking.note?.trim() || null,
      };
      if (row.status !== 'occupied') row.status = 'reserved';
    } else if (dto.booking === null) {
      row.booking = null;
      if (row.status === 'reserved') row.status = 'available';
    }

    if (dto.status) {
      if (dto.status === 'reserved' && !row.booking)
        throw new BadRequestException('Say who the table is booked for');
      row.status = dto.status;
    }

    // A free or cleaning table has no order and no booking.
    if (row.status === 'available' || row.status === 'cleaning') {
      row.orderId = null;
      row.booking = null;
      row.servedById = null;
      row.servedByName = null;
    }
    if (row.status === 'occupied' && !row.servedById) {
      row.servedById = user.sub;
      row.servedByName = user.name ?? null;
    }
    if (row.status !== before || !row.id) row.since = new Date();

    row = await this.tables.save(row);
    const orders = await this.ordersOf([row]);
    const view = this.view(row, orders);

    this.realtime.toStaff(company, VenueEvent.TABLE_UPDATED, view);
    return view;
  }

  private async ordersOf(rows: VenueTable[]) {
    const ids = rows.map((r) => r.orderId).filter((id): id is string => !!id);
    if (!ids.length) return new Map<string, TableOrder>();
    const found = await this.orders.find({
      where: { id: In(ids) },
      select: { id: true, status: true, total: true, createdAt: true },
    });
    return new Map(
      found.map((o) => [
        o.id,
        {
          id: o.id,
          status: o.status,
          total: Number(o.total) || 0,
          createdAt: o.createdAt,
        },
      ]),
    );
  }

  private view(row: VenueTable, orders: Map<string, TableOrder>) {
    return {
      tableId: row.tableId,
      status: row.status,
      since: row.since,
      orderId: row.orderId,
      order: row.orderId ? (orders.get(row.orderId) ?? null) : null,
      booking: row.booking,
      servedById: row.servedById,
      servedByName: row.servedByName,
    };
  }
}
