import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  Device,
  RegistrationStatusEnum,
  DeviceTypeEnum,
  deviceMomoCode,
} from './entities/device.entity';
import { DeviceActivity } from './entities/device-activity.entity';
import { CreateDeviceDto } from './dto/request/create-device.dto';
import { CompanyService } from '../company/company.service';
import { User, UserRole } from '../user/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  deviceSecretMatches,
  hashDeviceSecret,
  newDeviceSecret,
} from './device-secret';

import { UpdateDeviceTypeDto } from './dto/request/update-device-type.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,

    @InjectRepository(DeviceActivity)
    private readonly activityRepo: Repository<DeviceActivity>,

    private readonly companyService: CompanyService,

    private readonly realtime: RealtimeService,
  ) {}

  // Sessions opened on a device only work while it stays registered. `id` is Device.id.
  async assertUsable(id: string) {
    const device = await this.deviceRepo.findOne({
      where: { id },
      select: { id: true, registrationStatus: true },
    });

    if (device?.registrationStatus !== RegistrationStatusEnum.REGISTERED)
      throw new UnauthorizedException(
        `Device is ${device ? device.registrationStatus.toLowerCase() : 'removed'}, please login again`,
      );
  }

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
      // Public company details for the terminal's login screen (registered devices only).
      company: isValid
        ? {
            id: device.company.id,
            name: device.company.name,
            location: device.company.location,
            type: device.company.type,
            logo: device.company.logo ?? null,
          }
        : null,
      momoCode: isValid ? deviceMomoCode(device) : null,
    };
  }

  // Keep-alive from the terminal so it shows as online even when idle (e.g. on the
  // login screen). Authenticated with the device secret issued at registration.
  async heartbeat(deviceId: string, secret?: string) {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .addSelect('device.secretHash')
      .where('device.deviceId = :deviceId', { deviceId })
      .getOne();

    if (!device || !secret || !deviceSecretMatches(secret, device.secretHash))
      throw new UnauthorizedException('Invalid device secret');

    await this.touch(device.id, { lastSeenAt: new Date() });

    return { ok: true };
  }

  // Issues a new device secret (invalidating the old one). The secret is only ever
  // returned here, so the terminal must store it.
  async rotateSecret(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);
    const secret = newDeviceSecret();

    device.secretHash = hashDeviceSecret(secret);
    await this.deviceRepo.save(device);

    return { deviceId: device.deviceId, deviceSecret: secret };
  }

  async recordLogin(device: Device, user: User) {
    const now = new Date();

    await this.touch(device.id, {
      currentUser: { id: user.id } as User,
      lastLoginAt: now,
      lastSeenAt: now,
      lastActivity: 'Login',
      lastActivityAt: now,
    });

    await this.activityRepo.insert({
      device: { id: device.id },
      user: { id: user.id },
      action: 'Login',
    });
  }

  // The logout request itself is logged by DeviceActivityInterceptor.
  async recordLogout(deviceId: string, userId: string) {
    // Only clear the current user if nobody else has logged in on the device since.
    await this.deviceRepo
      .createQueryBuilder()
      .update()
      .set({ currentUser: null })
      .where('id = :deviceId AND current_user_id = :userId', {
        deviceId,
        userId,
      })
      .callListeners(false)
      .execute();
  }

  // Called for every authenticated request made from a device session.
  async recordRequest(
    deviceId: string,
    userId: string,
    request: {
      action: string;
      method: string;
      path: string;
      statusCode: number;
    },
    logActivity: boolean,
  ) {
    const now = new Date();

    await this.touch(deviceId, {
      lastSeenAt: now,
      lastActivity: request.action,
      lastActivityAt: now,
    });

    if (logActivity) {
      await this.activityRepo.insert({
        device: { id: deviceId },
        user: { id: userId },
        ...request,
      });
    }
  }

  async getActivities(
    userId: string,
    role: UserRole,
    deviceId: string,
    limit = 50,
  ) {
    const device = await this.getById(deviceId, userId, role);

    return this.activityRepo.find({
      where: { device: { id: device.id } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  async requestRegistration(dto: CreateDeviceDto) {
    const company = await this.companyService.findOne({
      code: dto.companyCode,
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existing = await this.deviceRepo.findOne({
      where: { deviceId: dto.deviceId },
    });

    // A rejected device may ask again (back to PENDING for a new decision); any other
    // known device is already waiting or has been decided on.
    if (
      existing &&
      existing.registrationStatus !== RegistrationStatusEnum.REJECTED
    ) {
      throw new ConflictException(
        `Device already exists with status ${existing.registrationStatus}`,
      );
    }

    const secret = newDeviceSecret();

    const device = await this.deviceRepo.save(
      Object.assign(existing ?? this.deviceRepo.create(), {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceOs: dto.deviceOs,
        company,
        registrationStatus: RegistrationStatusEnum.PENDING,
        secretHash: hashDeviceSecret(secret),
      }),
    );

    const { secretHash: _secretHash, ...result } = device;

    this.realtime.deviceRequested(result as Device);

    // Returned only once: the terminal must store it and send it with heartbeats.
    return { ...result, deviceSecret: secret };
  }

  async handleRegistration(
    userId: string,
    role: UserRole,
    deviceId: string,
    action: 'APPROVE' | 'REJECT',
    type?: DeviceTypeEnum,
  ) {
    const device = await this.getById(deviceId, userId, role);

    if (
      !device.company ||
      device.registrationStatus !== RegistrationStatusEnum.PENDING
    ) {
      throw new BadRequestException(
        'Only pending registration requests can be approved or rejected',
      );
    }

    if (action === 'APPROVE') {
      device.registrationStatus = RegistrationStatusEnum.REGISTERED;
      if (type) device.type = type;
    } else {
      device.registrationStatus = RegistrationStatusEnum.REJECTED;
    }

    return this.saveAndNotify(device);
  }

  // The owner decides what a device is used for; the device app switches screen
  // live (device.status) and the server only allows what fits the type.
  async setType(
    userId: string,
    role: UserRole,
    deviceId: string,
    dto: UpdateDeviceTypeDto,
  ) {
    const device = await this.getById(deviceId, userId, role);

    if (dto.type !== DeviceTypeEnum.CUSTOMER_DISPLAY) {
      if (dto.displayForId)
        throw new BadRequestException(
          'Only a customer display can be paired with a till',
        );
      device.displayFor = null;
    } else if (dto.displayForId === null) {
      device.displayFor = null;
    } else if (dto.displayForId) {
      if (dto.displayForId === device.id)
        throw new BadRequestException('A display cannot be paired with itself');

      const till = await this.findOne({
        id: dto.displayForId,
        company: { id: device.company?.id },
      });

      if (!till) throw new NotFoundException('Till not found');

      if (till.type !== DeviceTypeEnum.POS_TERMINAL)
        throw new BadRequestException(
          'A customer display can only be paired with a POS terminal',
        );

      device.displayFor = till;
    }

    device.type = dto.type;

    return this.saveAndNotify(device);
  }

  async setMomoCode(
    userId: string,
    role: UserRole,
    deviceId: string,
    momoCode: string | null,
  ) {
    const device = await this.getById(deviceId, userId, role);

    device.momoCode = momoCode || null;

    const saved = await this.saveAndNotify(device);

    // Displays without a code of their own show this till's.
    const displays = await this.deviceRepo.find({
      where: { displayFor: { id: saved.id } },
      relations: { displayFor: true },
    });
    displays.forEach((display) => this.realtime.deviceStatus(display));

    return saved;
  }

  async enableDevice(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);

    if (device.registrationStatus !== RegistrationStatusEnum.DISABLED) {
      throw new BadRequestException('Only disabled devices can be enabled');
    }

    device.registrationStatus = RegistrationStatusEnum.REGISTERED;

    return this.saveAndNotify(device);
  }

  async disableDevice(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);

    if (device.registrationStatus !== RegistrationStatusEnum.REGISTERED) {
      throw new BadRequestException('Only registered devices can be disabled');
    }

    device.registrationStatus = RegistrationStatusEnum.DISABLED;
    // Whoever was using it is logged out (see assertUsable).
    device.currentUser = null;

    return this.saveAndNotify(device);
  }

  async findAll(
    userId: string,
    role: UserRole,
    status?: RegistrationStatusEnum,
  ) {
    const company = await this.getUserCompany(userId, role);

    return await this.deviceRepo.find({
      where: {
        ...(company ? { company: { id: company.id } } : {}),
        ...(status ? { registrationStatus: status } : {}),
      },
      relations: { company: true, currentUser: true, displayFor: true },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(where: FindOptionsWhere<Device>) {
    return this.deviceRepo.findOne({
      where,
      relations: { company: true, currentUser: true, displayFor: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(
    where: FindOptionsWhere<Device>,
    userId?: string,
    role?: UserRole,
  ) {
    const company = userId
      ? await this.getUserCompany(userId, role)
      : undefined;

    const device = await this.findOne({
      ...where,
      ...(company ? { company: { id: company.id } } : {}),
    });

    if (!device) throw new NotFoundException('Device not found');

    return device;
  }

  async remove(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);
    // remove() clears the id on the entity.
    const { id, company } = device;

    const removed = await this.deviceRepo.remove(device);
    await this.realtime.deviceRemoved(id, company?.id);

    return removed;
  }

  private async saveAndNotify(device: Device) {
    const saved = await this.deviceRepo.save(device);
    await this.realtime.deviceUpdated(saved);
    return saved;
  }

  private async getById(deviceId: string, userId: string, role: UserRole) {
    return this.getOne({ id: deviceId }, userId, role);
  }

  // Tracking writes (last seen, current user, ...) happen on every request, so they
  // skip entity listeners to stay out of the audit history.
  private async touch(id: string, values: Partial<Device>) {
    await this.deviceRepo
      .createQueryBuilder()
      .update()
      .set(values)
      .where('id = :id', { id })
      .callListeners(false)
      .execute();
  }

  private async getUserCompany(userId: string, role?: UserRole) {
    if (role === UserRole.SUPERADMIN) return undefined;

    const company = await this.companyService.findOne({
      users: { id: userId },
    });

    if (!company) {
      throw new UnauthorizedException('User is not assigned to a company');
    }

    return company;
  }
}
