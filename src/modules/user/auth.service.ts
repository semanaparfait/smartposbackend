import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Not, Repository } from 'typeorm';
import {
  Device,
  RegistrationStatusEnum,
} from '../device/entities/device.entity';
import { LoginDto } from './dto/request/login.dto';
import { PinLoginDto } from './dto/request/pin-login.dto';
import { compareHashContent } from 'src/util';
import { TokenService } from 'src/util/token.service';
import { UserService } from './user.service';
import { DeviceService } from '../device/device.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,

    private readonly deviceService: DeviceService,

    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userService.findOne({
      active: true,
      email: dto.email,
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.role === UserRole.EMPLOYEE)
      throw new UnauthorizedException('Employees must login using PIN');

    if (!user.company) {
      throw new UnauthorizedException('User is not assigned to a company');
    }

    await this.deviceService.getOne({
      deviceId: dto.deviceId,
      registrationStatus: RegistrationStatusEnum.REGISTERED,
      company: { id: user.company.id },
    });

    const validPassword = await compareHashContent(dto.password, user.password);

    if (!validPassword) throw new UnauthorizedException('Invalid credentials');

    if (!user.active)
      throw new UnauthorizedException('User account is disabled');

    user.lastLoginAt = new Date();
    await this.userService.update(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company?.id,
    };

    return {
      accessToken: await this.tokenService.generateJWTTokens(payload),
    };
  }

  async pinLogin(dto: PinLoginDto) {
    const device = await this.deviceService.getOne({
      deviceId: dto.deviceId,
      registrationStatus: RegistrationStatusEnum.REGISTERED,
    });

    if (
      device.registrationStatus !== RegistrationStatusEnum.REGISTERED ||
      !device.company
    )
      throw new UnauthorizedException('Device is not registered');

    const users = await this.userService.findAll({
      role: UserRole.EMPLOYEE,
      active: true,
      company: { id: device.company.id },
    });

    let authenticatedUser: User | null = null;

    for (const user of users) {
      // if (user.role === UserRole.ADMIN || !user.company) {
      //   continue;
      // }

      // if (user.company.id !== device.company.id) {
      //   continue;
      // }

      const validPin = await compareHashContent(dto.pin, user.pin);

      if (validPin) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) throw new UnauthorizedException('Invalid PIN');

    authenticatedUser.lastLoginAt = new Date();

    await this.userService.update(authenticatedUser);

    const payload = {
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      companyId: authenticatedUser.company?.id,
    };

    return {
      accessToken: await this.tokenService.generateJWTTokens(payload),
    };
  }

  async me(userId: string) {
    return await this.userService.getOne({ id: userId });
  }
}
