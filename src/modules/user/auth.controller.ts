import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
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

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('pin-login')
  @ApiOperation({ summary: 'Login with PIN' })
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
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
