import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/request/login.dto';
import { PinLoginDto } from './dto/request/pin-login.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { ChangePinDto } from './dto/request/change-pin.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Public } from 'src/common/decorators/public.decorator';
import type { Request, Response } from 'express';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  keepRefreshInCookie,
  readCookie,
} from './refresh-cookie';
import { Throttle } from '@nestjs/throttler';
import { SIGN_IN_LIMIT } from 'src/common/security/security';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/request/password-reset.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(SIGN_IN_LIMIT)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(dto);
    return keepRefreshInCookie(res, session);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('refresh')
  @ApiOperation({
    summary: 'Website: a new short sign-in from the httpOnly cookie',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.refresh(
      readCookie(req, REFRESH_COOKIE),
    );
    if (!session) {
      clearRefreshCookie(res);
      throw new UnauthorizedException('Please sign in again');
    }
    return keepRefreshInCookie(res, session);
  }

  @Public()
  @Post('session/end')
  @ApiOperation({ summary: 'Website: sign out and forget the cookie' })
  async endSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.endWebSession(
      readCookie(req, REFRESH_COOKIE),
    );
    clearRefreshCookie(res);
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 40 } })
  @Post('pin-login')
  @ApiOperation({ summary: 'Login with PIN' })
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
  }

  @Public()
  @Throttle(SIGN_IN_LIMIT)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Send a code to set a new password (or ask the SmartPOS team)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle(SIGN_IN_LIMIT)
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password with the emailed code' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout' })
  logout(@User() user: Payload) {
    return this.authService.logout(user);
  }

  @Patch('change-pin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own PIN (employees)' })
  changePin(@User() user: Payload, @Body() dto: ChangePinDto) {
    return this.authService.changePin(user.sub, dto);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@User() user: Payload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Me' })
  me(@User() user: Payload) {
    return this.authService.me(user.sub);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile (name, phone, email, picture)' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiConsumes('multipart/form-data', 'application/json')
  updateProfile(
    @User() user: Payload,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.authService.updateProfile(user.sub, dto, picture);
  }
}
