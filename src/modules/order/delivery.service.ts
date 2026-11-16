import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import {
  scopeCompanyId,
  targetCompanyId,
} from 'src/common/utils/company-scope';
import { hasPermission } from 'src/common/permissions/permissions';
import { Company } from '../company/entities/company.entity';
import { FEATURES, featuresOf } from '../company/features';
import { ensureReadyRole, READY_ROLES } from '../employee/ready-roles';
import { User, UserRole } from '../user/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  DeliveryProof,
  DeliveryStatusEnum,
  GeoPosition,
  Order,
  OrderStatusEnum,
  OrderTypeEnum,
} from './entities/order.entity';
import { DeliveryPin } from './entities/delivery-pin.entity';
import {
  ArrivedDto,
  CodeSentDto,
  DeliveredDto,
  DeliveryDetailsDto,
  DeliveryProofDto,
  DeliverySettingsDto,
  NotDeliveredDto,
  SendDeliveryDto,
} from './dto/request/delivery.dto';
import { OrderService } from './order.service';
import { FileService } from '../file/file.service';
import { SmsService } from './sms.service';
import { codeSms, deliveredSms } from './delivery-messages';
import {
  AWAY_METRES,
  codesMatch,
  intlPhone,
  MAX_CODE_TRIES,
  metresBetween,
  newDeliveryCode,
  newTrackToken,
  PAGE_DAYS_AFTER,
  trackUrl,
} from './delivery-codes';

// Handover photos, sized like receipt photos.
const PROOF_SIZE = 'f_auto,q_auto,c_limit,w_1600';
// The person who marked it delivered may add the photo this long afterwards.
const PHOTO_MINUTES = 30;

const OPEN = [DeliveryStatusEnum.WAITING, DeliveryStatusEnum.ON_THE_WAY];

const toCents = (amount: number) => Math.round(Number(amount) * 100);

// Only workers given the permission on purpose; roles saved without a list
// (which allow everything) would make every worker a rider.
const canRide = (permissions: string[] | null | undefined) =>
  (permissions ?? []).includes('deliveries.ride');

// The signed-in worker is one of the shop's riders.
const isRider = (user: Payload) =>
  user.role === UserRole.EMPLOYEE && canRide(user.permissions);

// Who may see a customer's delivery code: the till and managers, never a rider
// (the rider must get it from the customer, or it proves nothing).
const canSeeCode = (user: Payload) =>
  !isRider(user) &&
  (hasPermission(user, 'deliveries.manage') ||
    hasPermission(user, 'sales.create'));

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly orders: OrderService,
    private readonly realtime: RealtimeService,
    private readonly files: FileService,
    private readonly sms: SmsService,
  ) {}

  // The delivery part of a new order, priced from the owner's settings (the till
  // can't choose the fee).
  async prepare(
    manager: EntityManager,
    companyId: string,
    dto: DeliveryDetailsDto,
  ): Promise<Partial<Order>> {
    const company = await manager.findOneOrFail(Company, {
      where: { id: companyId },
    });

    if (!company.deliveryEnabled)
      throw new BadRequestException(
        'Delivery is turned off. The owner can turn it on in Settings',
      );

    const areas = company.deliveryAreas ?? [];
    let fee = Number(company.deliveryFee) || 0;
    let area: string | null = null;

    if (areas.length) {
      const match = areas.find(
        (a) => a.name.toLowerCase() === dto.area?.trim().toLowerCase(),
      );
      if (!match) throw new BadRequestException('Choose a delivery area');
      fee = Number(match.fee) || 0;
      area = match.name;
    }

    if (dto.riderId) await this.assertRider(manager, companyId, dto.riderId);

    return {
      type: OrderTypeEnum.DELIVERY,
      deliveryStatus: DeliveryStatusEnum.WAITING,
      deliveryFee: fee,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone || null,
      deliveryAddress: dto.address || null,
      deliveryArea: area,
      payOnDelivery: dto.payOnDelivery,
      rider: dto.riderId ? ({ id: dto.riderId } as User) : null,
      outsideRider: dto.riderId ? null : dto.outsideRider || null,
      note: dto.note || undefined,
      // With codes on, the customer gets a code the rider must get back from them.
      ...(company.deliveryCodes
        ? {
            deliveryCodeRequired: true,
            deliveryCode: newDeliveryCode(),
            deliveryTrackToken: newTrackToken(),
            notifyBy: dto.notifyBy ?? (dto.customerPhone ? 'WHATSAPP' : null),
            customerLanguage: dto.customerLanguage ?? 'rw',
          }
        : {}),
    };
  }

  // Deliveries still on their way or waiting, plus those since `since`.
  // Managers see all; others the ones they made or carry. Riders also see the
  // waiting ones nobody has taken, so they can pick them.
  async list(user: Payload, since?: string, companyId?: string) {
    this.assertCanUse(user);
    const company = scopeCompanyId(user, companyId);
    const from = since ? new Date(since) : startOfToday();

    const query = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('user.employee', 'employee')
      .leftJoinAndSelect('o.rider', 'rider')
      .leftJoinAndSelect('rider.employee', 'riderEmployee')
      .leftJoinAndSelect('o.collectedBy', 'collectedBy')
      .leftJoinAndSelect('o.payments', 'payment')
      .where('o.type = :type', { type: OrderTypeEnum.DELIVERY })
      .andWhere('(o.delivery_status IN (:...open) OR o."createdAt" >= :from)', {
        open: OPEN,
        from,
      })
      .orderBy('o."createdAt"', 'DESC');

    if (company) query.andWhere('o.company_id = :company', { company });
    if (!hasPermission(user, 'deliveries.manage'))
      query.andWhere(
        isRider(user)
          ? `(o.user_id = :me OR o.rider_id = :me OR (o.rider_id IS NULL AND o.outside_rider IS NULL AND o.delivery_status = :waiting AND o.status != :cancelled))`
          : '(o.user_id = :me OR o.rider_id = :me)',
        {
          me: user.sub,
          waiting: DeliveryStatusEnum.WAITING,
          cancelled: OrderStatusEnum.CANCELLED,
        },
      );

    return this.withCodes(user, await query.getMany());
  }

  // Workers who can carry deliveries, to pick from.
  async riders(user: Payload, companyId?: string) {
    this.assertCanUse(user);
    const users = await this.dataSource.getRepository(User).find({
      where: {
        company: { id: targetCompanyId(user, companyId) },
        role: UserRole.EMPLOYEE,
        active: true,
      },
      relations: { employee: { role: true } },
    });
    return users
      .filter((u) => u.employee && canRide(u.employee.permissions))
      .map((u) => ({
        id: u.id,
        name: u.employee?.name ?? u.name,
        phone: u.employee?.phone ?? u.phone,
      }));
  }

  // On the road. A paid-now order must be paid first. Leaving out who takes it
  // keeps whoever was set (or nobody).
  async send(user: Payload, id: string, dto: SendDeliveryDto) {
    const order = await this.getForAction(user, id);

    if (order.deliveryStatus !== DeliveryStatusEnum.WAITING)
      throw new BadRequestException('This delivery was already sent');
    if (order.status === OrderStatusEnum.CANCELLED)
      throw new BadRequestException('This order was cancelled');
    if (!order.payOnDelivery && order.status !== OrderStatusEnum.COMPLETED)
      throw new BadRequestException('Take the payment before sending it');

    if (dto.riderId) {
      await this.assertRider(
        this.dataSource.manager,
        order.company.id,
        dto.riderId,
      );
      order.rider = { id: dto.riderId } as User;
      order.outsideRider = null;
    } else if (dto.outsideRider) {
      order.rider = null;
      order.outsideRider = dto.outsideRider;
    }
    // Who takes it is optional: many shops send it with whoever is free and
    // write it down later, or not at all.

    order.deliveryStatus = DeliveryStatusEnum.ON_THE_WAY;
    order.sentAt = new Date();
    return this.present(user, await this.saveAndShow(order));
  }

  // A rider takes a waiting delivery nobody has. Only one rider gets it when two
  // tap at the same time.
  async take(user: Payload, id: string) {
    if (!isRider(user))
      throw new ForbiddenException('Only riders can take deliveries');
    const company = targetCompanyId(user);

    const { affected } = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({ rider: { id: user.sub } })
      .where('id = :id', { id })
      .andWhere('company_id = :company', { company })
      .andWhere('type = :type', { type: OrderTypeEnum.DELIVERY })
      .andWhere('delivery_status = :waiting', {
        waiting: DeliveryStatusEnum.WAITING,
      })
      .andWhere('status != :cancelled', {
        cancelled: OrderStatusEnum.CANCELLED,
      })
      .andWhere('rider_id IS NULL AND outside_rider IS NULL')
      .execute();

    if (!affected)
      throw new BadRequestException('Another rider already took this delivery');
    return this.show(id);
  }

  // A rider gives back a delivery they took but haven't left with.
  async giveBack(user: Payload, id: string) {
    const order = await this.getForAction(user, id);
    if (order.rider?.id !== user.sub)
      throw new BadRequestException('This delivery is not yours');
    if (order.deliveryStatus !== DeliveryStatusEnum.WAITING)
      throw new BadRequestException('You already left with this delivery');

    order.rider = null;
    return this.present(user, await this.saveAndShow(order));
  }

  // The customer has it, straight from waiting or after being sent. Money taken
  // at the door is recorded here and counts as the money of whoever took it;
  // who carried it can be written down now too.
  async delivered(user: Payload, id: string, dto: DeliveredDto) {
    const order = await this.getForAction(user, id);

    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');
    if (order.status === OrderStatusEnum.CANCELLED)
      throw new BadRequestException('This order was cancelled');

    const needsMoney = order.status !== OrderStatusEnum.COMPLETED;
    const payments = dto.payments ?? [];
    if (needsMoney) {
      if (!payments.length)
        throw new BadRequestException('Enter the money received at the door');
      const paid = payments.reduce((sum, p) => sum + toCents(p.amount), 0);
      if (paid !== toCents(order.total))
        throw new BadRequestException(
          `The customer must pay ${Number(order.total).toLocaleString()} RWF`,
        );
    }

    if (dto.riderId)
      await this.assertRider(
        this.dataSource.manager,
        order.company.id,
        dto.riderId,
      );

    // The customer's code is checked before any money is recorded, so a wrong
    // code leaves the order exactly as it was.
    const checked = order.deliveryCodeRequired
      ? await this.checkProof(user, order, dto.proof)
      : null;

    if (needsMoney) {
      // Not limited to the worker's own orders: the rider didn't make it.
      await this.orders.completeOrder(user, id, { payments }, {});
      order.collectedBy = { id: user.sub } as User;
    }

    await this.orderRepo.update(id, {
      deliveryStatus: DeliveryStatusEnum.DELIVERED,
      deliveredAt: new Date(),
      // Off the kitchen screen: the customer has it.
      kitchenStatus: null,
      ...(order.collectedBy ? { collectedBy: { id: user.sub } } : {}),
      ...(dto.riderId
        ? { rider: { id: dto.riderId }, outsideRider: null }
        : dto.outsideRider
          ? { rider: null, outsideRider: dto.outsideRider }
          : {}),
      ...(checked
        ? {
            deliveryProof: checked.proof,
            deliveredPosition: checked.position,
          }
        : {}),
    });
    if (checked?.pin) await this.savePin(order, checked.pin);
    // Tell the customer at once; if they didn't get it, they call the shop.
    if (order.deliveryCodeRequired) void this.deliveredSms(id);
    return this.present(user, await this.show(id));
  }

  // The rider is at the customer's door. Their position helps check the
  // delivery later; without one, only the time is kept.
  async arrived(user: Payload, id: string, dto: ArrivedDto) {
    const order = await this.getForAction(user, id);
    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');

    await this.orderRepo.update(id, {
      arrivedAt: new Date(),
      arrivedPosition: dto.position ? position(dto.position) : null,
    });
    return this.present(user, await this.show(id));
  }

  // The till sent the customer their code (WhatsApp or SMS from its own phone).
  async codeSent(user: Payload, id: string, dto: CodeSentDto) {
    if (!canSeeCode(user))
      throw new ForbiddenException('Your role does not allow this');
    const order = await this.getForAction(user, id);
    if (!order.deliveryCodeRequired)
      throw new BadRequestException('This delivery has no code');

    await this.orderRepo.update(id, {
      codeSentAt: new Date(),
      notifyBy: dto.via,
    });
    return this.present(user, await this.show(id));
  }

  // A photo of the handover, for a delivery finished without the code. Only the
  // person who marked it delivered, soon after (or a manager).
  async proofPhoto(user: Payload, id: string, photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Add a photo of the handover');
    const order = await this.getForAction(user, id);
    const proof = order.deliveryProof;
    if (order.deliveryStatus !== DeliveryStatusEnum.DELIVERED || !proof)
      throw new BadRequestException('Mark the delivery delivered first');

    const manager = hasPermission(user, 'deliveries.manage');
    const minutes = order.deliveredAt
      ? (Date.now() - order.deliveredAt.getTime()) / 60_000
      : Infinity;
    if (!manager && (proof.by !== user.sub || minutes > PHOTO_MINUTES))
      throw new ForbiddenException(
        'Only who delivered it can add the photo, right after',
      );

    const photoUrl = await this.files.uploadImage(photo, PROOF_SIZE);
    if (proof.photoUrl) await this.files.deleteByUrl(proof.photoUrl);
    await this.orderRepo.update(id, {
      deliveryProof: { ...proof, photoUrl },
    });
    return this.present(user, await this.show(id));
  }

  // ---- SMS to the customer (when SMS_PROVIDER is set) ----

  // Right after checkout: the code goes out by itself. Never holds up the sale;
  // a failure only leaves "not sent" on the till, which can send it again.
  async autoSendCode(orderId: string) {
    try {
      await this.sendCodeSms(orderId);
    } catch {
      // Logged by SmsService; the till still shows the code and a send button.
    }
  }

  // The till asks for the code to be sent (again). 503 when the server has no
  // SMS provider: the app then opens its own SMS app or WhatsApp instead.
  async sendCode(user: Payload, id: string) {
    if (!canSeeCode(user))
      throw new ForbiddenException('Your role does not allow this');
    const order = await this.getForAction(user, id);
    if (!order.deliveryCodeRequired)
      throw new BadRequestException('This delivery has no code');
    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');
    // One SMS a minute per delivery: each one costs money.
    if (order.codeSentAt && Date.now() - order.codeSentAt.getTime() < 60_000)
      throw new BadRequestException(
        'The code was just sent. Wait a minute before sending it again',
      );

    const result = await this.sendCodeSms(id);
    if (result === 'OFF')
      throw new HttpException(
        'SMS is not set up on the server',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    if (result === 'NO_PHONE')
      throw new BadRequestException('This delivery has no phone number');
    if (result === 'FAILED')
      throw new HttpException(
        'The SMS could not be sent. Try again, or use WhatsApp',
        HttpStatus.BAD_GATEWAY,
      );
    return this.present(user, await this.show(id));
  }

  private async sendCodeSms(
    id: string,
  ): Promise<'SENT' | 'OFF' | 'FAILED' | 'NO_PHONE'> {
    if (!this.sms.enabled) return 'OFF';
    const order = await this.orderRepo.findOne({
      where: { id, deliveryCodeRequired: true },
      select: {
        id: true,
        deliveryCode: true,
        customerPhone: true,
        customerLanguage: true,
        payOnDelivery: true,
        status: true,
        total: true,
        company: { id: true, name: true, phone_number: true },
      },
      relations: { company: true },
    });
    const to = intlPhone(order?.customerPhone);
    if (!order?.deliveryCode || !to) return 'NO_PHONE';

    const result = await this.sms.send(
      to,
      codeSms({
        language: order.customerLanguage,
        shop: order.company.name,
        code: order.deliveryCode,
        phone: order.company.phone_number,
        toPay:
          order.payOnDelivery && order.status !== OrderStatusEnum.COMPLETED
            ? Number(order.total)
            : null,
      }),
    );
    if (result === 'SENT') {
      await this.orderRepo.update(id, {
        codeSentAt: new Date(),
        notifyBy: 'SMS',
      });
      await this.show(id);
    }
    return result;
  }

  private async deliveredSms(id: string) {
    try {
      if (!this.sms.enabled) return;
      const order = await this.orderRepo.findOne({
        where: { id },
        relations: { company: true, rider: { employee: true } },
      });
      const to = intlPhone(order?.customerPhone);
      if (!order || !to) return;
      const rider =
        order.rider?.employee?.name ?? order.rider?.name ?? order.outsideRider;
      await this.sms.send(
        to,
        deliveredSms({
          language: order.customerLanguage,
          shop: order.company.name,
          at: order.deliveredAt ?? new Date(),
          rider: rider ? rider.split(/[\s-]+/)[0] : null,
          phone: order.company.phone_number,
        }),
      );
    } catch {
      // Only a courtesy message: the delivery is already recorded.
    }
  }

  // Came back. An unpaid order is cancelled (nothing left the stock); a paid one
  // stays paid, so the money can be given back.
  async notDelivered(user: Payload, id: string, dto: NotDeliveredDto) {
    const order = await this.getForAction(user, id);

    if (!OPEN.includes(order.deliveryStatus!))
      throw new BadRequestException('This delivery is already finished');

    order.deliveryStatus = DeliveryStatusEnum.NOT_DELIVERED;
    order.deliveryProblem = dto.reason;
    order.kitchenStatus = null;
    if (order.status !== OrderStatusEnum.COMPLETED)
      order.status = OrderStatusEnum.CANCELLED;
    return this.present(user, await this.saveAndShow(order));
  }

  async saveSettings(user: Payload, dto: DeliverySettingsDto) {
    const companyId = targetCompanyId(user);
    const seen = new Set<string>();
    const areas = dto.areas.filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const company = await this.dataSource
      .getRepository(Company)
      .findOneOrFail({ where: { id: companyId } });
    if (dto.enabled && !featuresOf(company.features).delivery)
      throw new ForbiddenException(
        `${FEATURES.delivery} is not turned on for your company. Contact SmartPOS to add it`,
      );

    await this.dataSource.getRepository(Company).update(companyId, {
      deliveryEnabled: dto.enabled,
      deliveryFee: dto.fee,
      deliveryAreas: areas,
      deliveryRiders: dto.riders,
      // Left out by apps from before delivery codes: keep what was saved.
      ...(dto.codes !== undefined
        ? { deliveryCodes: dto.enabled && dto.codes }
        : {}),
    });
    const riderRole =
      dto.enabled && dto.riders
        ? await ensureReadyRole(
            this.dataSource.manager,
            companyId,
            READY_ROLES.rider,
          )
        : null;
    return {
      enabled: dto.enabled,
      fee: dto.fee,
      areas,
      riders: dto.riders,
      codes: dto.codes !== undefined ? dto.enabled && dto.codes : undefined,
      riderRole,
    };
  }

  // What the customer's page shows, found by its link. Null when the link is
  // wrong, or the delivery finished more than PAGE_DAYS_AFTER days ago.
  async customerPage(token: string) {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
    const order = await this.orderRepo.findOne({
      where: {
        deliveryTrackToken: token,
        type: OrderTypeEnum.DELIVERY,
        deliveryCodeRequired: true,
      },
      relations: { company: true, rider: { employee: true } },
    });
    if (!order) return null;

    const finished = !OPEN.includes(order.deliveryStatus!);
    const since = finished
      ? (order.deliveredAt ?? order.updatedAt)
      : order.createdAt;
    const days = (Date.now() - since.getTime()) / 86_400_000;
    if (days > (finished ? PAGE_DAYS_AFTER : 7)) return null;

    // The code only while it can still be used.
    const code = finished
      ? null
      : ((
          await this.orderRepo.findOne({
            where: { id: order.id },
            select: { id: true, deliveryCode: true },
          })
        )?.deliveryCode ?? null);

    const riderName =
      order.rider?.employee?.name ?? order.rider?.name ?? order.outsideRider;
    return {
      orderId: order.id,
      code,
      status: order.deliveryStatus!,
      deliveredAt: order.deliveredAt,
      language: order.customerLanguage ?? 'rw',
      customerName: order.customerName,
      rider: riderName ? riderName.split(/[\s-]+/)[0] : null,
      toPay:
        order.payOnDelivery && order.status !== OrderStatusEnum.COMPLETED
          ? Number(order.total)
          : null,
      shop: {
        name: order.company.name,
        phone: order.company.phone_number,
        logo: order.company.logo,
      },
    };
  }

  // ---- delivery codes ----

  // Checks how the customer's receipt was proven, and works out where it
  // happened. Wrong codes are counted (and saved) before refusing; after
  // MAX_CODE_TRIES only "no code" (flagged for the owner) is accepted.
  private async checkProof(
    user: Payload,
    order: Order,
    proof?: DeliveryProofDto,
  ): Promise<{
    proof: DeliveryProof;
    position: GeoPosition | null;
    pin: GeoPosition | null;
  }> {
    if (!proof || (!proof.code && !proof.noCodeReason))
      throw new BadRequestException("This delivery needs the customer's code");

    const secret = await this.orderRepo.findOne({
      where: { id: order.id },
      select: {
        id: true,
        deliveryCode: true,
        deliveryCodeTries: true,
        arrivedPosition: true,
        customerPhone: true,
      },
    });
    const tries = secret?.deliveryCodeTries ?? 0;

    let method: DeliveryProof['method'];
    const flags: NonNullable<DeliveryProof['flags']> = [];
    if (proof.code) {
      if (tries >= MAX_CODE_TRIES)
        throw new HttpException(
          'Too many wrong codes. Ask the shop to check this delivery',
          HttpStatus.LOCKED,
        );
      if (
        !secret?.deliveryCode ||
        !codesMatch(proof.code, secret.deliveryCode)
      ) {
        await this.orderRepo.increment(
          { id: order.id },
          'deliveryCodeTries',
          1,
        );
        const left = MAX_CODE_TRIES - tries - 1;
        if (left <= 0) {
          // Shown on every screen of the shop, so someone calls the customer.
          await this.show(order.id);
          throw new HttpException(
            'Too many wrong codes. Ask the shop to check this delivery',
            HttpStatus.LOCKED,
          );
        }
        throw new BadRequestException(
          `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left`,
        );
      }
      method = proof.via === 'QR' ? 'QR' : 'CODE';
    } else {
      method = 'NO_CODE';
      flags.push('NO_CODE');
    }

    // Where it happened, against the customer's usual place, or else where the
    // rider said they arrived. Only flagged: GPS in town can be far off.
    const here = proof.position ? position(proof.position) : null;
    const phone = intlPhone(secret?.customerPhone ?? order.customerPhone);
    const pin = phone
      ? await this.dataSource.getRepository(DeliveryPin).findOne({
          where: { company: { id: order.company.id }, phone },
        })
      : null;
    const reference = pin ?? secret?.arrivedPosition ?? null;

    let distanceM: number | null = null;
    if (!here) flags.push('NO_GPS');
    else if (reference) {
      distanceM = Math.round(metresBetween(here, reference));
      if (distanceM > AWAY_METRES + (here.accuracy ?? 0)) flags.push('AWAY');
    }

    return {
      proof: {
        method,
        distanceM,
        flags,
        photoUrl: null,
        note: method === 'NO_CODE' ? (proof.noCodeReason ?? null) : null,
        by: user.sub,
      },
      position: here,
      // A first delivery to this number, confirmed with the code and not far
      // from where the rider arrived, becomes the customer's place.
      pin:
        phone && !pin && here && method !== 'NO_CODE' && !flags.includes('AWAY')
          ? here
          : null,
    };
  }

  private async savePin(order: Order, at: GeoPosition) {
    const phone = intlPhone(order.customerPhone);
    if (!phone) return;
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(DeliveryPin)
      .values({
        company: { id: order.company.id },
        phone,
        lat: at.lat,
        lng: at.lng,
      })
      .orIgnore()
      .execute();
  }

  // The code and the customer's page link, added for those allowed to see
  // them. Copies, so the order objects already sent to live screens stay as
  // they were.
  private async withCodes(user: Payload, list: Order[]) {
    const ids = list.filter((o) => o.deliveryCodeRequired).map((o) => o.id);
    if (!ids.length || !canSeeCode(user)) return list;

    const secrets = await this.orderRepo.find({
      where: { id: In(ids) },
      select: { id: true, deliveryCode: true, deliveryTrackToken: true },
    });
    const byId = new Map(secrets.map((s) => [s.id, s]));
    return list.map((o) => {
      const s = byId.get(o.id);
      return s
        ? {
            ...o,
            deliveryCode: s.deliveryCode ?? null,
            deliveryTrackUrl: trackUrl(s.deliveryTrackToken),
          }
        : o;
    });
  }

  private async present(user: Payload, order: Order) {
    return (await this.withCodes(user, [order]))[0];
  }

  // ---- helpers ----

  private assertCanUse(user: Payload) {
    if (
      !['sales.create', 'deliveries.ride', 'deliveries.manage'].some((key) =>
        hasPermission(user, key),
      )
    )
      throw new ForbiddenException('Your role does not allow this');
  }

  private async assertRider(
    manager: EntityManager,
    companyId: string,
    riderId: string,
  ) {
    const rider = await manager.findOne(User, {
      where: {
        id: riderId,
        company: { id: companyId },
        role: UserRole.EMPLOYEE,
        active: true,
      },
      relations: { employee: { role: true } },
    });
    if (!rider?.employee || !canRide(rider.employee.permissions))
      throw new BadRequestException('That worker is not a rider');
  }

  // A delivery the user may move along: managers any, others their own or the
  // ones they carry.
  private async getForAction(user: Payload, id: string) {
    this.assertCanUse(user);
    const order = await this.orderRepo.findOne({
      where: {
        id,
        type: OrderTypeEnum.DELIVERY,
        ...(scopeCompanyId(user)
          ? { company: { id: scopeCompanyId(user) } }
          : {}),
      },
      relations: { company: true, user: true, rider: true },
    });

    const mine =
      order &&
      (hasPermission(user, 'deliveries.manage') ||
        order.user?.id === user.sub ||
        order.rider?.id === user.sub);
    if (!order || !mine) throw new NotFoundException('Delivery not found');

    return order;
  }

  private async saveAndShow(order: Order) {
    await this.orderRepo.save(order);
    return this.show(order.id);
  }

  private async show(id: string) {
    const order = await this.orderRepo.findOneOrFail({
      where: { id },
      relations: {
        items: { product: { images: true } },
        user: { employee: true },
        rider: { employee: true },
        collectedBy: true,
        payments: true,
        company: true,
      },
    });
    this.realtime.orderUpdated(order);
    return order;
  }
}

const position = (p: {
  lat: number;
  lng: number;
  accuracy?: number | null;
}): GeoPosition => ({ lat: p.lat, lng: p.lng, accuracy: p.accuracy ?? null });

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
