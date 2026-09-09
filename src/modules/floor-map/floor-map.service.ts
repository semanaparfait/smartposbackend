import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorMap } from './entities/floor-map.entity';
import { Company } from '../company/entities/company.entity';
import { CreateFloorMapDto } from './dto/request/create-floor-map.dto';
import { UpdateFloorMapDto } from './dto/request/update-floor-map.dto';

@Injectable()
export class FloorMapService {
  constructor(
    @InjectRepository(FloorMap)
    private readonly floorMapRepo: Repository<FloorMap>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateFloorMapDto) {
    const company = await this.companyRepo.findOne({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const floorMap = this.floorMapRepo.create({
      name: dto.name,
      company,
    });

    return this.floorMapRepo.save(floorMap);
  }

  async findAll() {
    return this.floorMapRepo.find({
      relations: { company: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const floorMap = await this.floorMapRepo.findOne({
      where: { id },
      relations: { company: true, rooms: true },
    });

    if (!floorMap) {
      throw new NotFoundException('Floor map not found');
    }

    return floorMap;
  }

  async update(id: string, dto: UpdateFloorMapDto) {
    const floorMap = await this.findOne(id);

    if (dto.companyId) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      floorMap.company = company;
    }

    Object.assign(floorMap, {
      name: dto.name ?? floorMap.name,
    });

    return this.floorMapRepo.save(floorMap);
  }

  async remove(id: string) {
    const floorMap = await this.findOne(id);

    return this.floorMapRepo.remove(floorMap);
  }
}
