import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/request/create-device.dto';
import { HandleDeviceRequestDto } from './dto/request/handle-device-request.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { Public } from 'src/common/decorators/public.decorator';
import { DeviceIdParam } from './dto/request/device-param.dto';

@ApiTags('Devices')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.SUPERADMIN)
@Controller('devices')
@ApiBearerAuth()
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

  @Public()
  @Get(':deviceId/verify')
  @ApiOperation({ summary: 'Verify device' })
  verify(@Param('deviceId') deviceId: string) {
    return this.service.verifyDevice(deviceId);
  }

  @Public()
  @Post('request-registration')
  @ApiOperation({ summary: 'Request registration' })
  request(@Body() dto: CreateDeviceDto) {
    return this.service.requestRegistration(dto);
  }

  @Patch(':deviceId/registration')
  @ApiOperation({ summary: 'Approve/ Reject request registration' })
  handle(
    @User() user: Payload,
    @Param() { deviceId }: DeviceIdParam,
    @Body() dto: HandleDeviceRequestDto,
  ) {
    return this.service.handleRegistration(
      user.sub,
      user.role,
      deviceId,
      dto.action,
    );
  }

  @Patch(':deviceId/enable')
  @ApiOperation({ summary: 'Enable device' })
  enable(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.enableDevice(user.sub, user.role, deviceId);
  }

  @Patch(':deviceId/disable')
  @ApiOperation({ summary: 'Disable device' })
  disable(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.disableDevice(user.sub, user.role, deviceId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  findAll(@User() user: Payload) {
    return this.service.findAll(user.sub, user.role);
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get device by id' })
  findOne(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.getOne({ deviceId }, user.sub, user.role);
  }

  @Delete(':deviceId/delete')
  @ApiOperation({ summary: 'Delete device' })
  remove(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.remove(user.sub, user.role, deviceId);
  }
}
