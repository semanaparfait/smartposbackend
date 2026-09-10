import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Device, RegistrationStatusEnum } from './entities/device.entity';
import { CreateDeviceDto } from './dto/request/create-device.dto';
import { UpdateDeviceDto } from './dto/request/update-device.dto';
import { CompanyService } from '../company/company.service';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,

    private readonly companyService: CompanyService,
  ) {}

  async verifyDevice(deviceId: string) {
    const device = await this.getOne({
      deviceId,
    });

    const isValid =
      device.registrationStatus === RegistrationStatusEnum.REGISTERED &&
      !!device.company;

    return {
      valid: isValid,
      deviceId: device.deviceId,
      status: device.registrationStatus,
      hasCompany: !!device.company,
    };
  }

  async requestRegistration(dto: CreateDeviceDto) {
    const company = await this.companyService.findOne({
      code: dto.companyCode,
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const device = this.deviceRepo.create({
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      deviceOs: dto.deviceOs,
      company,
    });

    return this.deviceRepo.save(device);
  }

  async handleRegistration(
    userId: string,
    deviceId: string,
    action: 'APPROVE' | 'REJECT',
  ) {
    const device = await this.getOne({ deviceId }, userId);

    if (!device.company) {
      throw new BadRequestException('Device has no registration request');
    }

    if (action === 'APPROVE') {
      device.registrationStatus = RegistrationStatusEnum.REGISTERED;
    } else {
      device.registrationStatus = RegistrationStatusEnum.REJECTED;
    }

    return this.deviceRepo.save(device);
  }

  async enableDevice(userId: string, deviceId: string) {
    const device = await this.getOne({ deviceId }, userId);

    if (device.registrationStatus !== RegistrationStatusEnum.DISABLED) {
      throw new BadRequestException('Only disabled devices can be enabled');
    }

    device.registrationStatus = RegistrationStatusEnum.REGISTERED;

    return this.deviceRepo.save(device);
  }

  async disableDevice(userId: string, deviceId: string) {
    const device = await this.getOne({ deviceId }, userId);

    if (device.registrationStatus !== RegistrationStatusEnum.REGISTERED) {
      throw new BadRequestException('Only registered devices can be disabled');
    }

    device.registrationStatus = RegistrationStatusEnum.DISABLED;

    return this.deviceRepo.save(device);
  }

  async findAll(userId: string) {
    const company = await this.getUserCompany(userId);

    return await this.deviceRepo.find({
      where: { company: { id: company.id } },
      relations: { company: true },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(where: FindOptionsWhere<Device>) {
    return this.deviceRepo.findOne({
      where,
      relations: { company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(where: FindOptionsWhere<Device>, userId?: string) {
    const company = userId ? await this.getUserCompany(userId) : undefined;

    const device = await this.findOne({
      ...where,
      ...(company ? { company: { id: company.id } } : {}),
    });

    if (!device) throw new NotFoundException('Device not found');

    return device;
  }

  async remove(userId: string, deviceId: string) {
    const device = await this.getOne({ deviceId }, userId);
    return this.deviceRepo.remove(device);
  }

  private async getUserCompany(userId: string) {
    const company = await this.companyService.findOne({
      users: { id: userId },
    });

    if (!company) {
      throw new UnauthorizedException('User is not assigned to a company');
    }

    return company;
  }
}
