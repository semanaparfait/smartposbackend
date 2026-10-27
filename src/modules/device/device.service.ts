import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Device, RegistrationStatusEnum } from './entities/device.entity';
import { DeviceActivity } from './entities/device-activity.entity';
import { CreateDeviceDto } from './dto/request/create-device.dto';
import { CompanyService } from '../company/company.service';
import { User, UserRole } from '../user/entities/user.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,

    @InjectRepository(DeviceActivity)
    private readonly activityRepo: Repository<DeviceActivity>,

    private readonly companyService: CompanyService,
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

    if (!device || !secret || !this.secretMatches(secret, device.secretHash))
      throw new UnauthorizedException('Invalid device secret');

    await this.touch(device.id, { lastSeenAt: new Date() });

    return { ok: true };
  }

  // Issues a new device secret (invalidating the old one). The secret is only ever
  // returned here, so the terminal must store it.
  async rotateSecret(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);
    const secret = this.newSecret();

    device.secretHash = this.hashSecret(secret);
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

    const secret = this.newSecret();

    const device = await this.deviceRepo.save(
      Object.assign(existing ?? this.deviceRepo.create(), {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceOs: dto.deviceOs,
        company,
        registrationStatus: RegistrationStatusEnum.PENDING,
        secretHash: this.hashSecret(secret),
      }),
    );

    const { secretHash: _secretHash, ...result } = device;

    // Returned only once: the terminal must store it and send it with heartbeats.
    return { ...result, deviceSecret: secret };
  }

  async handleRegistration(
    userId: string,
    role: UserRole,
    deviceId: string,
    action: 'APPROVE' | 'REJECT',
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
    } else {
      device.registrationStatus = RegistrationStatusEnum.REJECTED;
    }

    return this.deviceRepo.save(device);
  }

  async enableDevice(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);

    if (device.registrationStatus !== RegistrationStatusEnum.DISABLED) {
      throw new BadRequestException('Only disabled devices can be enabled');
    }

    device.registrationStatus = RegistrationStatusEnum.REGISTERED;

    return this.deviceRepo.save(device);
  }

  async disableDevice(userId: string, role: UserRole, deviceId: string) {
    const device = await this.getById(deviceId, userId, role);

    if (device.registrationStatus !== RegistrationStatusEnum.REGISTERED) {
      throw new BadRequestException('Only registered devices can be disabled');
    }

    device.registrationStatus = RegistrationStatusEnum.DISABLED;
    // Whoever was using it is logged out (see assertUsable).
    device.currentUser = null;

    return this.deviceRepo.save(device);
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
      relations: { company: true, currentUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(where: FindOptionsWhere<Device>) {
    return this.deviceRepo.findOne({
      where,
      relations: { company: true, currentUser: true },
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
    return this.deviceRepo.remove(device);
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

  private newSecret() {
    return randomBytes(32).toString('hex');
  }

  // The secret is random and high-entropy, so a fast hash is sufficient.
  private hashSecret(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
  }

  private secretMatches(secret: string, hash?: string | null) {
    if (!hash) return false;

    const a = Buffer.from(this.hashSecret(secret), 'hex');
    const b = Buffer.from(hash, 'hex');

    return a.length === b.length && timingSafeEqual(a, b);
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
