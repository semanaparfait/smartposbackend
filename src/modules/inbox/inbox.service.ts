import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from 'src/common/mail/mail.service';
import { Payload } from 'src/util/token.service';
import {
  InboxItem,
  InboxKindEnum,
  InboxStatusEnum,
} from './entities/inbox-item.entity';
import {
  ContactMessageDto,
  InboxQueryDto,
  InstallationRequestDto,
  UpdateInboxDto,
} from './dto/inbox.dto';

const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class InboxService {
  // Public forms: a few sends per address per quarter hour, against spam.
  private readonly sent = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @InjectRepository(InboxItem)
    private readonly repo: Repository<InboxItem>,
    private readonly mail: MailService,
  ) {}

  private limit(key: string) {
    const now = Date.now();
    const entry = this.sent.get(key);
    if (!entry || entry.resetAt <= now) {
      this.sent.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (entry.count >= LIMIT)
      throw new HttpException(
        'Too many messages, please try again a little later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    entry.count += 1;
  }

  async installation(dto: InstallationRequestDto, ip: string) {
    this.limit(`ip:${ip}`);
    const item = await this.repo.save(
      this.repo.create({
        kind: InboxKindEnum.INSTALLATION,
        name: dto.contactName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone.trim(),
        subject: dto.businessName.trim(),
        message: dto.notes?.trim() || null,
        details: {
          businessType: dto.businessType,
          location: dto.location.trim(),
          branches: dto.branches,
          plan: dto.plan,
          preferredDate: dto.preferredDate ?? null,
        },
      }),
    );
    await this.mail.notifyAdmin(
      `New installation request: ${item.subject}`,
      `${item.name} (${item.phone}${item.email ? `, ${item.email}` : ''}) asked for SmartPOS at ${item.subject}, ${dto.location}.\nPlan: ${dto.plan}. Branches: ${dto.branches}.${dto.notes ? `\n\n${dto.notes}` : ''}`,
    );
    return { id: item.id, message: 'Request received' };
  }

  async contact(dto: ContactMessageDto, ip: string) {
    this.limit(`ip:${ip}`);
    const item = await this.repo.save(
      this.repo.create({
        kind: InboxKindEnum.CONTACT,
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone?.trim() || null,
        subject: dto.topic.trim(),
        message: dto.message.trim(),
      }),
    );
    await this.mail.notifyAdmin(
      `New message: ${item.subject}`,
      `${item.name} (${item.email}${item.phone ? `, ${item.phone}` : ''}) wrote:\n\n${item.message}`,
    );
    return { id: item.id, message: 'Message received' };
  }

  // Someone forgot their password and no email could be sent to them.
  async passwordHelp(user: {
    name: string;
    email: string;
    phone?: string | null;
  }) {
    const open = await this.repo.findOne({
      where: {
        kind: InboxKindEnum.PASSWORD_HELP,
        email: user.email,
        status: InboxStatusEnum.NEW,
      },
    });
    if (open) return open;
    const item = await this.repo.save(
      this.repo.create({
        kind: InboxKindEnum.PASSWORD_HELP,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        subject: 'Forgot password',
        message:
          'Asked to reset their password on the sign-in page. Reset it from their user page and give them the new one.',
      }),
    );
    await this.mail.notifyAdmin(
      `Password help: ${user.name}`,
      `${user.name} (${user.email}) forgot their password.`,
    );
    return item;
  }

  list(query: InboxQueryDto) {
    return this.repo.find({
      where: {
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  countNew() {
    return this.repo.count({ where: { status: InboxStatusEnum.NEW } });
  }

  async update(user: Payload, id: string, dto: UpdateInboxDto) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Not found');
    if (dto.adminNote !== undefined)
      item.adminNote = dto.adminNote.trim() || null;
    if (dto.status && dto.status !== item.status) {
      item.status = dto.status;
      item.handledByName = user.name ?? user.email;
      item.handledAt = new Date();
    }
    return this.repo.save(item);
  }
}
