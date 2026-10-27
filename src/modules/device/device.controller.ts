import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Headers,
  ParseEnumPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
import { RegistrationStatusEnum } from './entities/device.entity';

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
  @Post(':deviceId/heartbeat')
  @ApiOperation({
    summary: 'Device heartbeat (call every ~30s to stay online)',
  })
  @ApiHeader({
    name: 'x-device-secret',
    description: 'Secret returned by request-registration or rotate-secret',
  })
  heartbeat(
    @Param('deviceId') deviceId: string,
    @Headers('x-device-secret') secret?: string,
  ) {
    return this.service.heartbeat(deviceId, secret);
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

  @Patch(':deviceId/rotate-secret')
  @ApiOperation({ summary: 'Issue a new device secret (shown once)' })
  rotateSecret(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.rotateSecret(user.sub, user.role, deviceId);
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
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RegistrationStatusEnum,
    description: 'e.g. PENDING for registration requests awaiting a decision',
  })
  findAll(
    @User() user: Payload,
    @Query(
      'status',
      new ParseEnumPipe(RegistrationStatusEnum, { optional: true }),
    )
    status?: RegistrationStatusEnum,
  ) {
    return this.service.findAll(user.sub, user.role, status);
  }

  @Get(':deviceId/activities')
  @ApiOperation({ summary: 'Get device activity log' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  activities(
    @User() user: Payload,
    @Param() { deviceId }: DeviceIdParam,
    @Query('limit') limit?: string,
  ) {
    return this.service.getActivities(
      user.sub,
      user.role,
      deviceId,
      limit ? Number(limit) || 50 : 50,
    );
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get device by id' })
  findOne(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.getOne({ id: deviceId }, user.sub, user.role);
  }

  @Delete(':deviceId/delete')
  @ApiOperation({ summary: 'Delete device' })
  remove(@User() user: Payload, @Param() { deviceId }: DeviceIdParam) {
    return this.service.remove(user.sub, user.role, deviceId);
  }
}
