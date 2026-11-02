import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';
import { requirePermission } from 'src/common/permissions/permissions';
import { FileService } from '../file/file.service';
import { ServiceOffering } from './entities/service.entity';
import {
  ServiceUnit,
  ServiceUnitStatusEnum,
} from './entities/service-unit.entity';
import { Booking, BookingStatusEnum } from './entities/booking.entity';
import {
  CreateServiceDto,
  CreateUnitDto,
  UpdateServiceDto,
  UpdateUnitDto,
} from './dto/service.dto';

const PICTURE_SIZE = 'f_auto,q_auto,c_limit,w_800';
const OPEN = [BookingStatusEnum.RESERVED, BookingStatusEnum.ACTIVE];

// The services a company offers and their bookable units.
@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceOffering)
    private readonly serviceRepo: Repository<ServiceOffering>,

    @InjectRepository(ServiceUnit)
    private readonly unitRepo: Repository<ServiceUnit>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    private readonly fileService: FileService,
  ) {}

  async create(
    user: Payload,
    dto: CreateServiceDto,
    picture?: Express.Multer.File,
  ) {
    const companyId = targetCompanyId(user, dto.companyId);
    const {
      companyId: _companyId,
      picture: _picture,
      pictureUrl,
      units = [],
      ...fields
    } = dto;
    const names = this.uniqueNames(units);
    const image = picture ?? pictureUrl;
    const imageUrl = image
      ? await this.fileService.uploadImage(image, PICTURE_SIZE)
      : null;

    try {
      const saved = await this.serviceRepo.manager.transaction(
        async (manager) => {
          const service = await manager.save(
            manager.create(ServiceOffering, {
              ...fields,
              imageUrl,
              company: { id: companyId },
            }),
          );

          if (names.length)
            await manager.save(
              names.map((name) =>
                manager.create(ServiceUnit, { name, service }),
              ),
            );

          return service;
        },
      );

      return this.getOne(user, saved.id);
    } catch (error) {
      await this.fileService.deleteByUrl(imageUrl);
      throw error;
    }
  }

  // Inactive services are included so the owner can turn them back on.
  async getAll(user: Payload, companyId?: string) {
    return this.serviceRepo.find({
      where: companyWhere(user, companyId),
      relations: { units: true },
      order: { name: 'ASC', units: { name: 'ASC' } },
    });
  }

  async getOne(user: Payload, id: string) {
    const service = await this.serviceRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { units: true, company: true },
      order: { units: { name: 'ASC' } },
    });

    if (!service) throw new NotFoundException('Service not found');

    return service;
  }

  async update(
    user: Payload,
    id: string,
    dto: UpdateServiceDto,
    picture?: Express.Multer.File,
  ) {
    const service = await this.getOne(user, id);
    const {
      companyId: _companyId,
      picture: _picture,
      pictureUrl,
      units: _units,
      ...fields
    } = dto;
    const image = picture ?? pictureUrl;
    const oldImage = service.imageUrl;

    Object.assign(service, fields);

    if (image)
      service.imageUrl = await this.fileService.uploadImage(
        image,
        PICTURE_SIZE,
      );

    const { units: _loaded, ...changes } = service;

    try {
      await this.serviceRepo.save(changes);
    } catch (error) {
      if (image) await this.fileService.deleteByUrl(service.imageUrl);
      throw error;
    }

    if (image) await this.fileService.deleteByUrl(oldImage);

    return this.getOne(user, id);
  }

  // Booked services are kept for their history; turn them off instead.
  async remove(user: Payload, id: string) {
    const service = await this.getOne(user, id);

    if (await this.bookingRepo.existsBy({ service: { id } }))
      throw new BadRequestException(
        'This service has bookings, so it is kept for the records. Turn it off instead',
      );

    await this.serviceRepo.remove(service);
    await this.fileService.deleteByUrl(service.imageUrl);
  }

  async addUnit(user: Payload, serviceId: string, dto: CreateUnitDto) {
    const service = await this.getOne(user, serviceId);
    const name = dto.name.trim();

    this.assertNameFree(service.units, name);

    return this.unitRepo.save(this.unitRepo.create({ name, service }));
  }

  async updateUnit(user: Payload, unitId: string, dto: UpdateUnitDto) {
    const unit = await this.getUnit(user, unitId);

    if (dto.name !== undefined && dto.name.trim() !== unit.name) {
      requirePermission(user, 'services.setup');
      const name = dto.name.trim();
      const siblings = await this.unitRepo.find({
        where: { service: { id: unit.service.id } },
      });
      this.assertNameFree(
        siblings.filter((other) => other.id !== unit.id),
        name,
      );
      unit.name = name;
    }

    if (dto.status !== undefined && dto.status !== unit.status) {
      const inUse = await this.bookingRepo.existsBy({
        unit: { id: unitId },
        status: BookingStatusEnum.ACTIVE,
      });

      if (dto.status === ServiceUnitStatusEnum.OCCUPIED || inUse)
        throw new BadRequestException(
          inUse
            ? `${unit.name} is in use. Check the customer out first`
            : 'Check a customer in to mark it as in use',
        );

      unit.status = dto.status;
    }

    const { service: _service, ...changes } = unit;
    await this.unitRepo.save(changes);

    return this.getUnit(user, unitId);
  }

  async removeUnit(user: Payload, unitId: string) {
    const unit = await this.getUnit(user, unitId);

    if (
      await this.bookingRepo.existsBy({
        unit: { id: unitId },
        status: In(OPEN),
      })
    )
      throw new BadRequestException(
        `${unit.name} has bookings that are not finished. Move or cancel them first`,
      );

    await this.unitRepo.remove(unit);
  }

  async getUnit(user: Payload, id: string) {
    const unit = await this.unitRepo.findOne({
      where: { id, service: companyWhere(user) },
      relations: { service: { company: true } },
    });

    if (!unit) throw new NotFoundException('Unit not found');

    return unit;
  }

  searchImages(query: string) {
    const term = query?.trim();

    if (!term || term.length < 2)
      throw new BadRequestException('Type at least 2 letters to search');

    return this.fileService.searchImages(term.slice(0, 100));
  }

  private uniqueNames(names: string[]) {
    const seen = new Set<string>();
    return names
      .map((name) => name.trim())
      .filter((name) => {
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private assertNameFree(units: ServiceUnit[], name: string) {
    if (units.some((unit) => unit.name.toLowerCase() === name.toLowerCase()))
      throw new BadRequestException(`There is already one called ${name}`);
  }
}
