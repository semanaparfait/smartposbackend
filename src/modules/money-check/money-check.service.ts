import { PushService } from '../notifications/push.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';
import { User } from '../user/entities/user.entity';
import {
  MoneyCheck,
  MoneyCheckStatusEnum,
} from './entities/money-check.entity';
import { SaveMoneyCheckDto } from './dto/money-check.dto';

@Injectable()
export class MoneyCheckService {
  constructor(
    @InjectRepository(MoneyCheck)
    private readonly repo: Repository<MoneyCheck>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly push: PushService,
  ) {}

  // Checks for the company, optionally only between two days (inclusive).
  list(user: Payload, from?: string, to?: string, companyId?: string) {
    const where: FindOptionsWhere<MoneyCheck> = {
      ...companyWhere(user, companyId),
      ...(from && to ? { date: Between(from, to) } : {}),
    };
    return this.repo.find({
      where,
      relations: { worker: true },
      order: { date: 'DESC' },
    });
  }

  // One check per worker per day: saving again replaces it.
  async save(user: Payload, dto: SaveMoneyCheckDto) {
    const companyId = targetCompanyId(user);

    const [worker, decider, existing] = await Promise.all([
      this.userRepo.findOne({
        where: { id: dto.userId, company: { id: companyId } },
        relations: { employee: true },
      }),
      this.userRepo.findOne({
        where: { id: user.sub },
        relations: { employee: true },
      }),
      this.repo.findOne({
        where: {
          company: { id: companyId },
          date: dto.date,
          worker: { id: dto.userId },
        },
      }),
    ]);
    if (!worker) throw new NotFoundException('Worker not found');

    const check = this.repo.merge(existing ?? this.repo.create(), {
      company: { id: companyId },
      date: dto.date,
      worker: { id: worker.id },
      status: dto.status,
      counted: dto.counted,
      expected: dto.expected,
      difference: dto.difference,
      note: dto.note?.trim() || null,
      decidedAt: dto.decidedAt ? new Date(dto.decidedAt) : new Date(),
      decidedBy: { id: user.sub },
      decidedByName:
        dto.decidedBy?.trim() ||
        decider?.employee?.name ||
        decider?.name ||
        'Unknown',
    });

    const wasFlagged = existing?.status === MoneyCheckStatusEnum.FLAGGED;
    const saved = await this.repo.save(check);
    // A new flag: whoever checks money hears at once.
    if (saved.status === MoneyCheckStatusEnum.FLAGGED && !wasFlagged) {
      const short = -Number(saved.difference);
      void this.push.notifyCompany(companyId, 'finance.verify', {
        title: `Money check flagged: ${worker.employee?.name ?? worker.name}`,
        body:
          short > 0
            ? `${Math.round(short).toLocaleString('en-US')} RWF short on ${saved.date}. Checked by ${saved.decidedByName}.`
            : `Flagged for ${saved.date} by ${saved.decidedByName}.`,
        screen: 'money-checks',
        data: { date: saved.date, userId: worker.id },
      });
      void this.push.whatsappOwners(companyId, 'smartpos_money_flagged', [
        worker.employee?.name ?? worker.name,
        saved.date,
        short > 0
          ? `${Math.round(short).toLocaleString('en-US')} RWF short`
          : saved.note || 'see SmartPOS',
        saved.decidedByName,
      ]);
    }
    return this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { worker: true },
    });
  }

  // Opens the day for counting again.
  async remove(user: Payload, date: string, userId: string) {
    const check = await this.repo.findOne({
      where: { ...companyWhere(user), date, worker: { id: userId } },
    });
    if (!check) throw new NotFoundException('Check not found');
    await this.repo.remove(check);
    return { message: 'Check removed' };
  }
}
