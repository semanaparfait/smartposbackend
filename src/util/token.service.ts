import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from 'src/modules/user/entities/user.entity';

export class Payload {
  sub!: string;
  email!: string;
  name?: string;
  role!: UserRole;
  companyId?: string;
  // Database id (Device.id) of the registered device the session was opened on.
  deviceId?: string;
  // Not in the token: loaded per request by RolesGuard for employees, from their
  // role's current permissions (null = role allows everything).
  permissions?: string[] | null;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateJWTTokens(payload: Payload) {
    const access = this.config.get(`server.jwt_access`);
    const access_token = await this.jwtService.signAsync(
      { ...payload, type: 'access_token' },
      {
        secret: access.secret,
        expiresIn: access.expiresIn,
      },
    );

    return access_token;
  }

  async verifyJWTToken(token: string, type: string) {
    try {
      const jwtAccess = this.config.get(type);

      const payload: Payload = await this.jwtService.verifyAsync(token, {
        secret: `${jwtAccess.secret}`,
      });

      return payload;
    } catch (error: any) {
      throw new UnauthorizedException(`${error.message}`);
    }
  }
}
