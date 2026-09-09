import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from 'src/modules/user/entities/user.entity';

export class Payload {
  sub!: string;
  email!: string;
  role!: UserRole;
  companyId?: string;
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
