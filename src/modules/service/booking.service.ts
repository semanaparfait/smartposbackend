import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere } from 'src/common/utils/company-scope';
import { Booking, BookingStatusEnum } from './entities/booking.entity';
import { BookingPayment } from './entities/booking-payment.entity';
import { ServiceKindEnum, ServiceOffering } from './entities/service.entity';
import {
  ServiceUnit,
  ServiceUnitStatusEnum,
} from './entities/service-unit.entity';
import {
  BookingModeEnum,
  BookingPaymentDto,
  BookingQueryDto,
  CancelBookingDto,
  CheckOutDto,
  CreateBookingDto,
  RefundBookingDto,
  TakingsQueryDto,
} from './dto/booking.dto';
import { bookedQuantity, isTimed, measuredQuantity, money } from './pricing';

// Letters and digits that can't be mixed up when read out (no 0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const OPEN = [BookingStatusEnum.RESERVED, BookingStatusEnum.ACTIVE];
const HOUR_MS = 3_600_000;
// A booking ahead with no end time holds its unit for this long.
const DEFAULT_HOLD_MS = HOUR_MS;

const STATUS_WORDS: Record<ServiceUnitStatusEnum, string> = {
  AVAILABLE: 'free',
  OCCUPIED: 'in use',
  CLEANING: 'being cleaned. Mark it ready first',
  MAINTENANCE: 'under maintenance',
};

const newCode = () =>
  Array.from(
    { length: 6 },
    () => CODE_CHARS[randomInt(CODE_CHARS.length)],
  ).join('');

// Money taken minus money given back.
const netPaid = (payments: BookingPayment[] = []) =>
  money(
    payments.reduce(
      (sum, p) => sum + (p.isRefund ? -1 : 1) * Number(p.amount),
      0,
    ),
  );

// A booking as the app shows it: with what is paid and what is still owed.
const present = (booking: Booking) => {
  const paid = netPaid(booking.payments);
  const refunded = money(
    (booking.payments ?? [])
      .filter((p) => p.isRefund)
      .reduce((sum, p) => sum + Number(p.amount), 0),
  );
  const { user, payments, ...rest } = booking;

  return {
    ...rest,
    takenBy: user ? { id: user.id, name: user.name } : null,
    payments: (payments ?? [])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(({ user: by, booking: _booking, receiptCheckedBy, ...payment }) => ({
        ...payment,
        takenBy: by ? { id: by.id, name: by.name } : null,
        receiptCheckedBy: receiptCheckedBy
          ? { id: receiptCheckedBy.id, name: receiptCheckedBy.name }
          : null,
      })),
    paid,
    refunded,
    // A cancelled booking owes nothing; what was paid may still be refunded.
    balance:
      booking.status === BookingStatusEnum.CANCELLED
        ? 0
        : money(Number(booking.total) - paid),
  };
};

export type BookingView = ReturnType<typeof present>;

// Bookings of services: reserve, check in, check out, cancel and take money.
@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @InjectRepository(BookingPayment)
    private readonly paymentRepo: Repository<BookingPayment>,
  ) {}

  async create(user: Payload, dto: CreateBookingDto) {
    const id = await this.bookingRepo.manager.transaction(async (manager) => {
      const service = await manager.findOne(ServiceOffering, {
        where: { id: dto.serviceId, ...companyWhere(user) },
        relations: { units: true, company: true },
      });

      if (!service) throw new NotFoundException('Service not found');
      if (!service.active)
        throw new BadRequestException(`${service.name} is turned off`);

      const now = new Date();
      const people = dto.people ?? 1;
      const startAt =
        dto.mode === BookingModeEnum.BOOK && dto.startAt
          ? new Date(dto.startAt)
          : now;
      const endAt = dto.endAt ? new Date(dto.endAt) : null;

      if (endAt && endAt <= startAt)
        throw new BadRequestException('The end must be after the start');

      if (service.capacity && people > service.capacity)
        throw new BadRequestException(
          `${service.name} takes up to ${service.capacity} people`,
        );

      let unit: ServiceUnit | null = null;

      if (service.units.length) {
        if (!dto.unitId)
          throw new BadRequestException(`Choose which ${service.name}`);

        // Locked so two tills can't give out the same unit at once.
        unit = await manager.findOne(ServiceUnit, {
          where: { id: dto.unitId, service: { id: service.id } },
          lock: { mode: 'pessimistic_write' },
        });

        if (!unit) throw new NotFoundException('Unit not found');

        if (
          dto.mode !== BookingModeEnum.BOOK &&
          unit.status !== ServiceUnitStatusEnum.AVAILABLE
        )
          throw new BadRequestException(
            `${unit.name} is ${STATUS_WORDS[unit.status]}`,
          );

        await this.assertUnitFree(
          manager,
          unit,
          startAt,
          endAt,
          dto.mode !== BookingModeEnum.BOOK,
        );
      }

      const quantity = bookedQuantity(
        service.priceUnit,
        startAt,
        endAt,
        people,
        dto.sessions,
      );
      const sold = dto.mode === BookingModeEnum.SELL;
      const started = dto.mode !== BookingModeEnum.BOOK;

      if (sold && isTimed(service.priceUnit) && !endAt)
        throw new BadRequestException(
          'Charged by time: check the customer in instead',
        );

      const booking = await manager.save(
        manager.create(Booking, {
          company: { id: service.company.id },
          service,
          unit,
          user: { id: user.sub },
          code: newCode(),
          customerName: dto.customerName?.trim() || 'Walk-in',
          customerPhone: dto.customerPhone ?? null,
          people,
          startAt,
          endAt,
          checkedInAt: started ? now : null,
          checkedOutAt: sold ? now : null,
          status: sold
            ? BookingStatusEnum.COMPLETED
            : started
              ? BookingStatusEnum.ACTIVE
              : BookingStatusEnum.RESERVED,
          priceUnit: service.priceUnit,
          unitPrice: service.price,
          quantity,
          total: money(quantity * Number(service.price)),
          note: dto.note ?? null,
        }),
      );

      if (unit && started && !sold)
        await manager.update(ServiceUnit, unit.id, {
          status: ServiceUnitStatusEnum.OCCUPIED,
        });

      if (dto.payment)
        await this.takePayment(manager, user, booking, dto.payment, 0);

      return booking.id;
    });

    return this.getOne(user, id);
  }

  // Bookings starting in the range, plus everything still running or reserved
  // so nothing in progress is ever hidden by the dates.
  async getAll(user: Payload, query: BookingQueryDto) {
    const scope = companyWhere(user, query.companyId);
    const where: FindOptionsWhere<Booking>[] = [];

    if (query.from || query.to) {
      where.push({
        ...scope,
        ...(query.status ? { status: query.status } : {}),
        startAt: Between(
          query.from ? new Date(query.from) : new Date(0),
          query.to ? new Date(query.to) : new Date(8.64e15),
        ),
      });
      if (!query.status || OPEN.includes(query.status))
        where.push({ ...scope, status: query.status ?? In(OPEN) });
    } else {
      where.push({
        ...scope,
        ...(query.status ? { status: query.status } : {}),
      });
    }

    const bookings = await this.bookingRepo.find({
      where,
      relations: {
        service: true,
        unit: true,
        user: true,
        payments: { user: true, receiptCheckedBy: true },
      },
      // Without dates, the newest come first so the limit drops only old ones.
      order: { startAt: query.from || query.to ? 'ASC' : 'DESC' },
      take: 500,
    });

    return bookings.map(present);
  }

  async getOne(user: Payload, id: string) {
    return present(await this.find(user, id));
  }

  async checkIn(user: Payload, id: string) {
    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.find(user, id, manager);

      if (booking.status !== BookingStatusEnum.RESERVED)
        throw new BadRequestException(
          'Only a reserved booking can be checked in',
        );

      if (booking.unit) {
        const unit = await manager.findOne(ServiceUnit, {
          where: { id: booking.unit.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (unit && unit.status !== ServiceUnitStatusEnum.AVAILABLE)
          throw new BadRequestException(
            `${unit.name} is ${STATUS_WORDS[unit.status]}`,
          );

        await manager.update(ServiceUnit, booking.unit.id, {
          status: ServiceUnitStatusEnum.OCCUPIED,
        });
      }

      await manager.update(Booking, id, {
        status: BookingStatusEnum.ACTIVE,
        checkedInAt: new Date(),
      });
    });

    return this.getOne(user, id);
  }

  // Charges for the time actually used (never less than what was booked), takes
  // any payment given, and frees the unit. Rooms go to cleaning first.
  async checkOut(user: Payload, id: string, dto: CheckOutDto) {
    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.find(user, id, manager);

      if (booking.status !== BookingStatusEnum.ACTIVE)
        throw new BadRequestException(
          'Only a booking in use can be checked out',
        );

      const now = new Date();
      const charged = isTimed(booking.priceUnit)
        ? Math.max(
            Number(booking.quantity),
            measuredQuantity(
              booking.priceUnit,
              booking.checkedInAt ?? booking.startAt,
              now,
            ),
          )
        : Number(booking.quantity);
      const gross = money(charged * Number(booking.unitPrice));
      const discount = money(dto.discount ?? Number(booking.discount));

      if (discount > gross)
        throw new BadRequestException('The discount is more than the total');

      Object.assign(booking, {
        status: BookingStatusEnum.COMPLETED,
        checkedOutAt: now,
        quantity: charged,
        discount,
        total: money(gross - discount),
      });

      const {
        payments,
        unit,
        service,
        user: _user,
        company: _c,
        ...changes
      } = booking;
      await manager.save(Booking, { ...changes, id });

      if (unit)
        await manager.update(ServiceUnit, unit.id, {
          status:
            service.kind === ServiceKindEnum.ROOM
              ? ServiceUnitStatusEnum.CLEANING
              : ServiceUnitStatusEnum.AVAILABLE,
        });

      if (dto.payment)
        await this.takePayment(
          manager,
          user,
          booking,
          dto.payment,
          netPaid(payments),
        );
    });

    return this.getOne(user, id);
  }

  // A reservation, or something already in use (it stops and frees the unit).
  // Money paid stays recorded until it is refunded.
  async cancel(user: Payload, id: string, dto: CancelBookingDto) {
    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.find(user, id, manager);

      if (!OPEN.includes(booking.status))
        throw new BadRequestException('This booking is already closed');

      const inUse = booking.status === BookingStatusEnum.ACTIVE;

      await manager.update(Booking, id, {
        status: BookingStatusEnum.CANCELLED,
        cancelReason: dto.reason.trim(),
        ...(inUse ? { checkedOutAt: new Date() } : {}),
      });

      if (inUse && booking.unit)
        await manager.update(ServiceUnit, booking.unit.id, {
          status:
            booking.service.kind === ServiceKindEnum.ROOM
              ? ServiceUnitStatusEnum.CLEANING
              : ServiceUnitStatusEnum.AVAILABLE,
        });
    });

    return this.getOne(user, id);
  }

  // Gives money back, never more than what was paid, and records why.
  async refund(user: Payload, id: string, dto: RefundBookingDto) {
    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.find(user, id, manager);
      const paid = netPaid(booking.payments);

      if (dto.amount > paid)
        throw new BadRequestException(
          paid > 0
            ? `Only ${paid.toLocaleString()} RWF was paid`
            : 'Nothing was paid on this booking',
        );

      await manager.save(
        manager.create(BookingPayment, {
          booking: { id },
          method: dto.method,
          amount: money(dto.amount),
          isRefund: true,
          reason: dto.reason.trim(),
          user: { id: user.sub },
        }),
      );
    });

    return this.getOne(user, id);
  }

  async addPayment(user: Payload, id: string, dto: BookingPaymentDto) {
    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.find(user, id, manager);

      await this.takePayment(
        manager,
        user,
        booking,
        dto,
        netPaid(booking.payments),
      );
    });

    return this.getOne(user, id);
  }

  // Money taken for bookings in a period, by method and by service, after
  // refunds (which count on the day they were given back).
  async takings(user: Payload, query: TakingsQueryDto) {
    const payments = await this.paymentRepo.find({
      where: {
        booking: companyWhere(user, query.companyId),
        createdAt: Between(new Date(query.from), new Date(query.to)),
      },
      relations: { booking: { service: true } },
    });

    const byMethod: Record<string, number> = {};
    const byService: Record<string, { name: string; amount: number }> = {};
    let total = 0;
    let refunded = 0;

    for (const payment of payments) {
      const amount = (payment.isRefund ? -1 : 1) * Number(payment.amount);
      const service = payment.booking.service;
      total += amount;
      if (payment.isRefund) refunded -= amount;
      byMethod[payment.method] = money(
        (byMethod[payment.method] ?? 0) + amount,
      );
      byService[service.id] = {
        name: service.name,
        amount: money((byService[service.id]?.amount ?? 0) + amount),
      };
    }

    return {
      total: money(total),
      refunded: money(refunded),
      byMethod,
      byService: Object.entries(byService)
        .map(([serviceId, value]) => ({ serviceId, ...value }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  private async takePayment(
    manager: EntityManager,
    user: Payload,
    booking: Booking,
    dto: BookingPaymentDto,
    alreadyPaid: number,
  ) {
    if (booking.status === BookingStatusEnum.CANCELLED)
      throw new BadRequestException('This booking was cancelled');

    // Until checkout an open-ended booking has no total yet, so any amount can be
    // taken as a deposit; once the total is known, no more than what is owed.
    const knownTotal =
      booking.status === BookingStatusEnum.COMPLETED ||
      !isTimed(booking.priceUnit) ||
      !!booking.endAt;
    const owed = money(Number(booking.total) - alreadyPaid);

    if (knownTotal && dto.amount > owed)
      throw new BadRequestException(
        owed > 0
          ? `Only ${owed.toLocaleString()} RWF is owed`
          : 'Nothing is owed on this booking',
      );

    await manager.save(
      manager.create(BookingPayment, {
        booking: { id: booking.id },
        method: dto.method,
        amount: money(dto.amount),
        user: { id: user.sub },
      }),
    );
  }

  // Overlap with another unfinished booking of the same unit. Something in use
  // with no end holds the unit until checked out.
  private async assertUnitFree(
    manager: EntityManager,
    unit: ServiceUnit,
    startAt: Date,
    endAt: Date | null,
    startingNow: boolean,
  ) {
    const others = await manager.find(Booking, {
      where: { unit: { id: unit.id }, status: In(OPEN) },
    });
    const until = (b: { startAt: Date; endAt: Date | null; active: boolean }) =>
      b.endAt?.getTime() ??
      (b.active ? Infinity : b.startAt.getTime() + DEFAULT_HOLD_MS);
    const mine = {
      start: startAt.getTime(),
      end: until({ startAt, endAt, active: startingNow }),
    };

    const clash = others.find(
      (other) =>
        other.startAt.getTime() < mine.end &&
        until({
          startAt: other.startAt,
          endAt: other.endAt,
          active: other.status === BookingStatusEnum.ACTIVE,
        }) > mine.start,
    );

    if (clash)
      throw new BadRequestException(
        `${unit.name} is already booked for ${clash.customerName} at that time (${clash.code})`,
      );
  }

  private async find(user: Payload, id: string, manager?: EntityManager) {
    const repo = manager?.getRepository(Booking) ?? this.bookingRepo;
    const booking = await repo.findOne({
      where: { id, ...companyWhere(user) },
      relations: {
        service: true,
        unit: true,
        user: true,
        payments: { user: true, receiptCheckedBy: true },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }
}
