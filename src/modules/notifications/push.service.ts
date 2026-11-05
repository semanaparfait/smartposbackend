import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { PushToken } from './push-token.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { Booking, BookingStatusEnum } from '../service/entities/booking.entity';
import { addDays, toDay } from '../company/billing';
import {
  WhatsAppService,
  type WhatsAppTemplate,
} from 'src/common/whatsapp/whatsapp.service';

// What a notification opens in the app (see the app's notifications handler).
export type PushScreen =
  | 'devices'
  | 'money-checks'
  | 'bookings'
  | 'subscription'
  | 'day-closing';

export interface PushMessage {
  title: string;
  body: string;
  screen: PushScreen;
  data?: Record<string, string>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BOOKING_LEAD_MINUTES = 15;
const DUE_SOON_DAYS = 3;
const OVERDUE_EVERY_DAYS = 7;

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

// Phone notifications through Expo's push service (free; it passes them on to
// Google and Apple). EXPO_ACCESS_TOKEN is optional and only needed when "push
// security" is turned on for the Expo project. PUSH_SCHEDULER=off stops the
// booking and subscription reminders (e.g. on a second server).
@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    @InjectRepository(PushToken)
    private readonly tokens: Repository<PushToken>,
    private readonly dataSource: DataSource,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // The company's owners on WhatsApp. The company name is always the first
  // value of the template ({{1}}); `values` fill the rest.
  async whatsappOwners(
    companyId: string,
    template: WhatsAppTemplate,
    values: string[],
  ) {
    if (!this.whatsapp.enabled) return;
    try {
      const [company, owners] = await Promise.all([
        this.dataSource
          .getRepository(Company)
          .findOne({ where: { id: companyId } }),
        this.dataSource.getRepository(User).find({
          where: {
            company: { id: companyId },
            role: UserRole.OWNER,
            active: true,
          },
        }),
      ]);
      const name = company?.name ?? 'SmartPOS';
      await Promise.all(
        owners.map((o) =>
          this.whatsapp.send(o.phone, template, [name, ...values]),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Could not WhatsApp the owners of ${companyId}: ${String(error)}`,
      );
    }
  }

  // ---- Phones ----

  async register(userId: string, token: string, platform = 'unknown') {
    const existing = await this.tokens.findOne({
      where: { token },
      relations: { user: true },
    });
    if (existing) {
      // The phone changed hands (another person signed in on it): it follows them.
      existing.user = { id: userId } as User;
      existing.platform = platform;
      await this.tokens.save(existing);
    } else {
      await this.tokens.save(
        this.tokens.create({ token, platform, user: { id: userId } }),
      );
    }
    return { message: 'Notifications are on for this phone' };
  }

  async unregister(userId: string, token: string) {
    await this.tokens.delete({ token, user: { id: userId } });
    return { message: 'Notifications are off for this phone' };
  }

  // ---- Who hears about what ----

  // The company's owners, plus the workers allowed to deal with it.
  async audience(companyId: string, permission?: string) {
    const users = await this.dataSource.getRepository(User).find({
      where: { company: { id: companyId }, active: true },
      relations: { employee: { role: true } },
    });
    return users
      .filter((u) => {
        if (u.role === UserRole.OWNER) return true;
        if (u.role !== UserRole.EMPLOYEE || !permission || !u.employee)
          return false;
        const allowed = u.employee.permissions;
        return allowed === null || !!allowed?.includes(permission);
      })
      .map((u) => u.id);
  }

  async notifyCompany(
    companyId: string,
    permission: string | undefined,
    message: PushMessage,
  ) {
    try {
      await this.send(await this.audience(companyId, permission), message);
    } catch (error) {
      this.logger.warn(
        `Could not notify company ${companyId}: ${String(error)}`,
      );
    }
  }

  // Never throws: a notification failing must not fail the action behind it.
  async send(userIds: string[], message: PushMessage) {
    if (!userIds.length) return;
    const phones = await this.tokens.find({
      where: { user: { id: In(userIds) } },
    });
    if (!phones.length) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN)
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    // Expo takes up to 100 messages per request.
    for (let i = 0; i < phones.length; i += 100) {
      const batch = phones.slice(i, i + 100);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(
            batch.map((p) => ({
              to: p.token,
              title: message.title,
              body: message.body,
              sound: 'default',
              priority: 'high',
              channelId: 'default',
              data: { screen: message.screen, ...message.data },
            })),
          ),
        });
        const result = (await response.json().catch(() => null)) as {
          data?: Ticket[];
        } | null;
        // Phones that uninstalled the app or turned notifications off are forgotten.
        const gone = (result?.data ?? [])
          .map((ticket, n) =>
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
              ? batch[n]?.id
              : null,
          )
          .filter((id): id is string => !!id);
        if (gone.length) await this.tokens.delete({ id: In(gone) });
        if (!response.ok)
          this.logger.warn(`Expo push replied ${response.status}`);
      } catch (error) {
        this.logger.warn(`Could not reach Expo push: ${String(error)}`);
      }
    }
  }

  // ---- Reminders ----

  onModuleInit() {
    if (process.env.PUSH_SCHEDULER === 'off' || process.env.NODE_ENV === 'test')
      return;
    this.timers.push(
      setInterval(() => void this.remindBookings(), 60_000),
      setInterval(() => void this.remindSubscriptions(), 60 * 60_000),
      setTimeout(() => void this.remindSubscriptions(), 30_000),
    );
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  // Bookings starting within 15 minutes, told once to the service desk.
  async remindBookings() {
    try {
      const repo = this.dataSource.getRepository(Booking);
      const now = new Date();
      const soon = await repo.find({
        where: {
          status: BookingStatusEnum.RESERVED,
          remindedAt: IsNull(),
          startAt: LessThanOrEqual(
            new Date(now.getTime() + BOOKING_LEAD_MINUTES * 60_000),
          ),
        },
        relations: { company: true, service: true, unit: true },
        take: 200,
      });
      for (const booking of soon) {
        // Mark first, so a slow send never repeats it.
        await repo.update(booking.id, { remindedAt: now });
        // Only ones that haven't started more than 15 minutes ago.
        if (
          booking.startAt.getTime() <
          now.getTime() - BOOKING_LEAD_MINUTES * 60_000
        )
          continue;
        const minutes = Math.max(
          0,
          Math.round((booking.startAt.getTime() - now.getTime()) / 60_000),
        );
        const where = booking.unit?.name ? ` · ${booking.unit.name}` : '';
        await this.notifyCompany(booking.company.id, 'services.manage', {
          title:
            minutes > 0
              ? `Booking in ${minutes} min: ${booking.customerName}`
              : `Booking starting now: ${booking.customerName}`,
          body: `${booking.service?.name ?? 'Booking'}${where} · ${booking.code}`,
          screen: 'bookings',
          data: { bookingId: booking.id },
        });
      }
    } catch (error) {
      this.logger.warn(`Booking reminders failed: ${String(error)}`);
    }
  }

  // Owners hear 3 days before the subscription runs out, and every 7 days
  // while it is overdue.
  async remindSubscriptions() {
    try {
      const repo = this.dataSource.getRepository(Company);
      const today = toDay(new Date());
      const companies = await repo.find({
        where: {
          active: true,
          paidUntil: LessThanOrEqual(addDays(today, DUE_SOON_DAYS)),
        },
      });
      for (const c of companies) {
        if (!c.plan || !c.paidUntil) continue;
        const overdue = c.paidUntil < today;
        const last = c.billingRemindedOn;
        const due = overdue
          ? !last ||
            last <= c.paidUntil ||
            addDays(last, OVERDUE_EVERY_DAYS) <= today
          : !last || last < addDays(c.paidUntil, -DUE_SOON_DAYS);
        if (!due) continue;
        await repo.update(c.id, { billingRemindedOn: today });
        const date = new Date(`${c.paidUntil}T12:00:00`).toLocaleDateString(
          'en-GB',
          { day: 'numeric', month: 'short', year: 'numeric' },
        );
        await this.notifyCompany(c.id, undefined, {
          title: overdue
            ? 'Your SmartPOS subscription is overdue'
            : 'Your SmartPOS subscription ends soon',
          body: overdue
            ? `It was paid until ${date}. Please pay to keep using SmartPOS.`
            : `It is paid until ${date}. Pay before then to keep selling without a break.`,
          screen: 'subscription',
        });
        await this.whatsappOwners(c.id, 'smartpos_subscription', [
          overdue ? 'was paid until' : 'is paid until',
          date,
        ]);
      }
    } catch (error) {
      this.logger.warn(`Subscription reminders failed: ${String(error)}`);
    }
  }
}
