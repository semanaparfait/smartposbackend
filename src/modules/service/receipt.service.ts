import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere } from 'src/common/utils/company-scope';
import { UserRole } from '../user/entities/user.entity';
import {
  BookingPayment,
  ReceiptStatusEnum,
} from './entities/booking-payment.entity';
import { ConfirmReceiptsDto, ReceiptQueryDto } from './dto/receipt.dto';

const person = (user: { id: string; name: string } | null) =>
  user ? { id: user.id, name: user.name } : null;

// One payment as the owner checks it: what it was for and who handled it.
const present = (payment: BookingPayment) => ({
  id: payment.id,
  method: payment.method,
  amount: payment.amount,
  isRefund: payment.isRefund,
  reason: payment.reason,
  createdAt: payment.createdAt,
  takenBy: person(payment.user),
  receipt: payment.receipt,
  receiptNote: payment.receiptNote,
  receiptCheckedAt: payment.receiptCheckedAt,
  receiptCheckedBy: person(payment.receiptCheckedBy),
  booking: {
    id: payment.booking.id,
    code: payment.booking.code,
    customerName: payment.booking.customerName,
    status: payment.booking.status,
    service: {
      id: payment.booking.service.id,
      name: payment.booking.service.name,
      kind: payment.booking.service.kind,
    },
    unit: payment.booking.unit
      ? { id: payment.booking.unit.id, name: payment.booking.unit.name }
      : null,
  },
});

// Confirming that the money of booking payments really reached the business.
@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(BookingPayment)
    private readonly paymentRepo: Repository<BookingPayment>,
  ) {}

  // Waiting payments are listed whatever their date, so nothing old is missed.
  async list(user: Payload, query: ReceiptQueryDto) {
    const where: FindOptionsWhere<BookingPayment> = {
      booking: companyWhere(user, query.companyId),
      ...(query.receipt ? { receipt: query.receipt } : {}),
      ...(query.from || query.to
        ? {
            createdAt: Between(
              query.from ? new Date(query.from) : new Date(0),
              query.to ? new Date(query.to) : new Date(8.64e15),
            ),
          }
        : {}),
    };

    const payments = await this.paymentRepo.find({
      where,
      relations: {
        booking: { service: true, unit: true },
        user: true,
        receiptCheckedBy: true,
      },
      order: { createdAt: 'ASC' },
      take: 1000,
    });

    return payments.map(present);
  }

  async confirm(user: Payload, dto: ConfirmReceiptsDto) {
    const payments = await this.load(user, dto.ids);

    payments.forEach((payment) =>
      this.mark(user, payment, ReceiptStatusEnum.CONFIRMED, null),
    );
    await this.save(payments);

    return this.reload(user, dto.ids);
  }

  async missing(user: Payload, id: string, note: string) {
    const [payment] = await this.load(user, [id]);

    this.mark(user, payment, ReceiptStatusEnum.MISSING, note.trim());
    await this.save([payment]);

    return (await this.reload(user, [id]))[0];
  }

  // Back to waiting, e.g. confirmed by mistake.
  async reopen(user: Payload, id: string) {
    const [payment] = await this.load(user, [id]);

    this.mark(user, payment, ReceiptStatusEnum.PENDING, null);
    await this.save([payment]);

    return (await this.reload(user, [id]))[0];
  }

  private mark(
    user: Payload,
    payment: BookingPayment,
    receipt: ReceiptStatusEnum,
    note: string | null,
  ) {
    // Someone checking their own takings is no check at all; owners run the
    // business, so their word stands.
    if (user.role === UserRole.EMPLOYEE && payment.user?.id === user.sub)
      throw new ForbiddenException(
        `You took ${payment.booking.code}'s payment yourself. Someone else has to check it`,
      );

    const pending = receipt === ReceiptStatusEnum.PENDING;
    payment.receipt = receipt;
    payment.receiptNote = note;
    payment.receiptCheckedAt = pending ? null : new Date();
    payment.receiptCheckedBy = pending ? null : ({ id: user.sub } as never);
  }

  // Only the receipt columns, so a payment is never changed in any other way.
  private async save(payments: BookingPayment[]) {
    await this.paymentRepo.manager.transaction(async (manager) => {
      for (const payment of payments)
        await manager.update(BookingPayment, payment.id, {
          receipt: payment.receipt,
          receiptNote: payment.receiptNote,
          receiptCheckedAt: payment.receiptCheckedAt,
          receiptCheckedBy: payment.receiptCheckedBy
            ? { id: payment.receiptCheckedBy.id }
            : null,
        });
    });
  }

  private async load(user: Payload, ids: string[]) {
    const payments = await this.paymentRepo.find({
      where: { id: In(ids), booking: companyWhere(user) },
      relations: { booking: true, user: true },
    });

    if (payments.length !== new Set(ids).size)
      throw new NotFoundException('Payment not found');

    return payments;
  }

  private async reload(user: Payload, ids: string[]) {
    const payments = await this.paymentRepo.find({
      where: { id: In(ids), booking: companyWhere(user) },
      relations: {
        booking: { service: true, unit: true },
        user: true,
        receiptCheckedBy: true,
      },
      order: { createdAt: 'ASC' },
    });

    return payments.map(present);
  }
}
