import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorMap } from './entities/floor-map.entity';
import { Company } from '../company/entities/company.entity';
import { CreateFloorMapDto } from './dto/request/create-floor-map.dto';
import { UpdateFloorMapDto } from './dto/request/update-floor-map.dto';
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  isSuperAdmin,
  targetCompanyId,
} from 'src/common/utils/company-scope';

@Injectable()
export class FloorMapService {
  constructor(
    @InjectRepository(FloorMap)
    private readonly floorMapRepo: Repository<FloorMap>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(user: Payload, dto: CreateFloorMapDto) {
    const company = await this.getCompany(targetCompanyId(user, dto.companyId));

    const floorMap = this.floorMapRepo.create({
      name: dto.name,
      company,
    });

    return this.floorMapRepo.save(floorMap);
  }

  async findAll(user: Payload, companyId?: string) {
    return this.floorMapRepo.find({
      where: companyWhere(user, companyId),
      relations: { company: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(user: Payload, id: string) {
    const floorMap = await this.floorMapRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { company: true, rooms: true },
    });

    if (!floorMap) {
      throw new NotFoundException('Floor map not found');
    }

    return floorMap;
  }

  async update(user: Payload, id: string, dto: UpdateFloorMapDto) {
    const floorMap = await this.findOne(user, id);

    // Only a super admin may move a floor map to another company.
    if (dto.companyId && isSuperAdmin(user)) {
      floorMap.company = await this.getCompany(dto.companyId);
    }

    Object.assign(floorMap, {
      name: dto.name ?? floorMap.name,
    });

    return this.floorMapRepo.save(floorMap);
  }

  async remove(user: Payload, id: string) {
    const floorMap = await this.findOne(user, id);

    return this.floorMapRepo.remove(floorMap);
  }

  // helpers

  private async getCompany(id: string) {
    const company = await this.companyRepo.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }
}
