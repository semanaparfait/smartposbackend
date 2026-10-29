import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole } from './entities/user.entity';
import {
  Device,
  DeviceTypeEnum,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { LoginDto } from './dto/request/login.dto';
import { PinLoginDto } from './dto/request/pin-login.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { ChangePinDto } from './dto/request/change-pin.dto';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { compareHashContent } from 'src/util';
import { Payload, TokenService } from 'src/util/token.service';
import { LoginThrottleService } from 'src/util/login-throttle.service';
import { UserService } from './user.service';
import { DeviceService } from '../device/device.service';
import { RealtimeService } from '../realtime/realtime.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,

    private readonly deviceService: DeviceService,

    private readonly tokenService: TokenService,

    private readonly throttle: LoginThrottleService,

    private readonly realtime: RealtimeService,
  ) {}

  async login(dto: LoginDto) {
    const throttleKey = `email:${dto.email.toLowerCase()}`;
    this.throttle.assertAllowed(throttleKey);

    const user = await this.userService.findWithSecrets({
      active: true,
      email: dto.email,
    });

    // Check the password before anything else so failures don't reveal which emails exist.
    if (!user || !(await compareHashContent(dto.password, user.password))) {
      this.throttle.recordFailure(throttleKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.throttle.reset(throttleKey);

    if (user.role === UserRole.EMPLOYEE)
      throw new UnauthorizedException('Employees must login using PIN');

    let device: Device | undefined;

    if (user.role !== UserRole.SUPERADMIN) {
      if (!user.company) {
        throw new UnauthorizedException('User is not assigned to a company');
      }

      if (!dto.deviceId) {
        throw new UnauthorizedException('Device ID is required');
      }

      device = await this.deviceService.getOne({
        deviceId: dto.deviceId,
        registrationStatus: RegistrationStatusEnum.REGISTERED,
        company: { id: user.company.id },
      });
    }

    return this.openSession(user, device);
  }

  async pinLogin(dto: PinLoginDto) {
    // A 6-digit PIN is easy to guess, so failed attempts are limited per device.
    const throttleKey = `pin:${dto.deviceId}`;
    this.throttle.assertAllowed(throttleKey);

    const device = await this.deviceService.getOne({
      deviceId: dto.deviceId,
      registrationStatus: RegistrationStatusEnum.REGISTERED,
    });

    if (!device.company)
      throw new UnauthorizedException('Device is not registered');

    const users = await this.userService.findAllWithSecrets({
      role: UserRole.EMPLOYEE,
      active: true,
      company: { id: device.company.id },
    });

    let authenticatedUser: User | null = null;

    for (const user of users) {
      if (user.pin && (await compareHashContent(dto.pin, user.pin))) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      this.throttle.recordFailure(throttleKey);
      throw new UnauthorizedException('Invalid PIN');
    }

    this.throttle.reset(throttleKey);

    return this.openSession(authenticatedUser, device);
  }

  async logout(user: Payload) {
    if (user.deviceId)
      await this.deviceService.recordLogout(user.deviceId, user.sub);

    return { message: 'Logged out' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userService.findWithSecrets({ id: userId });

    if (
      !user ||
      !(await compareHashContent(dto.currentPassword, user.password))
    )
      throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must be different');

    await this.userService.changePassword(userId, dto.newPassword);

    return { message: 'Password changed' };
  }

  async changePin(userId: string, dto: ChangePinDto) {
    // Each attempt can reveal whether a PIN is in use, so attempts are limited.
    const throttleKey = `change-pin:${userId}`;
    this.throttle.assertAllowed(throttleKey);

    try {
      if (
        !(await this.userService.changePin(userId, dto.currentPin, dto.newPin))
      ) {
        this.throttle.recordFailure(throttleKey);
        throw new BadRequestException('Current PIN is incorrect');
      }
    } catch (error) {
      if (error instanceof ConflictException)
        this.throttle.recordFailure(throttleKey);
      throw error;
    }

    this.throttle.reset(throttleKey);

    return { message: 'PIN changed' };
  }

  async me(userId: string) {
    return await this.userService.getProfile(userId);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    picture?: Express.Multer.File,
  ) {
    return await this.userService.updateProfile(userId, dto, picture);
  }

  private async openSession(user: User, device?: Device) {
    if (device?.type === DeviceTypeEnum.CUSTOMER_DISPLAY)
      throw new ForbiddenException('Nobody signs in on a customer display');

    await this.userService.touchLastLogin(user.id, new Date());

    if (device) await this.deviceService.recordLogin(device, user);

    const sid = randomUUID();

    // An employee's latest login becomes their session; unless the owner allows
    // several devices, sessions on other devices end now.
    if (user.role === UserRole.EMPLOYEE) {
      await this.userService.setSession(user.id, sid);

      if (!user.allowMultipleDevices)
        await this.realtime.signedInElsewhere(user.id, sid, device?.id);
    }

    const payload: Payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.company?.id,
      deviceId: device?.id,
      sid,
    };

    return {
      accessToken: await this.tokenService.generateJWTTokens(payload),
      mustChangePassword: user.mustChangePassword,
    };
  }
}
