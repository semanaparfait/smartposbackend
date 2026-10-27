import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Payload } from 'src/util/token.service';
import { scopeCompanyId } from 'src/common/utils/company-scope';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(user: Payload, query: AuditLogQueryDto) {
    const companyId = scopeCompanyId(user, query.companyId);

    const where: FindOptionsWhere<AuditLog> = {
      ...(companyId ? { companyId } : {}),
      ...(query.entityName ? { entityName: query.entityName } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const limit = query.limit ?? 50;
    const page = query.page ?? 1;

    const [data, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total, page, limit };
  }

  findRecentForCompany(companyId: string, limit = 30) {
    return this.auditRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
