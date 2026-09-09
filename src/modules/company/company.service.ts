import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto) {
    const company = this.repo.create(dto);
    return this.repo.save(company);
  }

  async findAll() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(where: FindOptionsWhere<Company>) {
    const company = await this.findOne(where);

    if (!company) throw new NotFoundException('Company not found');

    return company;
  }

  async findOne(where: FindOptionsWhere<Company>) {
    return await this.repo.findOne({ where });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.getOne({ id });

    Object.assign(company, dto);

    return this.repo.save(company);
  }

  async remove(id: string) {
    const company = await this.getOne({ id });

    return this.repo.remove(company);
  }
}
