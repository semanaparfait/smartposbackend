import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { PushService } from './push.service';
import { PushTokenDto } from './push.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE, UserRole.SUPERADMIN)
@AnyEmployee()
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly push: PushService) {}

  @Post('phones')
  @ApiOperation({ summary: 'Send notifications to this phone' })
  register(@User() user: Payload, @Body() dto: PushTokenDto) {
    return this.push.register(user.sub, dto.token, dto.platform);
  }

  @Delete('phones')
  @ApiOperation({ summary: 'Stop notifications to this phone (signing out)' })
  unregister(@User() user: Payload, @Body() dto: PushTokenDto) {
    return this.push.unregister(user.sub, dto.token);
  }
}
