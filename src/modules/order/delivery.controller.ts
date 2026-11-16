import { Feature } from 'src/common/decorators/feature.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { DeliveryService } from './delivery.service';
import { OrderIdParam } from './dto/request/order-param.dto';
import {
  ArrivedDto,
  CodeSentDto,
  DeliveredDto,
  DeliverySettingsDto,
  NotDeliveredDto,
  SendDeliveryDto,
} from './dto/request/delivery.dto';

// Who may use these is checked in the service: anyone who sells, rides or
// manages deliveries; each only sees the deliveries they made or carry unless
// they manage deliveries.
@ApiTags('Deliveries')
@Feature('delivery')
@Controller('deliveries')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get()
  @AnyEmployee()
  @ApiOperation({ summary: 'Open deliveries, plus those since `since`' })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'ISO time; start of today if left out',
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  list(
    @User() user: Payload,
    @Query('since') since?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.list(user, since, companyId);
  }

  @Get('riders')
  @AnyEmployee()
  @ApiOperation({ summary: 'Workers who can carry deliveries' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  riders(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.riders(user, companyId);
  }

  @Put('settings')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Turn delivery on or off and set its fees' })
  saveSettings(@User() user: Payload, @Body() dto: DeliverySettingsDto) {
    return this.service.saveSettings(user, dto);
  }

  @Patch(':orderId/send')
  @AnyEmployee()
  @ApiOperation({ summary: 'Send a delivery on its way' })
  send(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: SendDeliveryDto,
  ) {
    return this.service.send(user, orderId, dto);
  }

  @Patch(':orderId/take')
  @AnyEmployee()
  @ApiOperation({ summary: 'A rider takes a waiting delivery nobody has' })
  take(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.take(user, orderId);
  }

  @Patch(':orderId/give-back')
  @AnyEmployee()
  @ApiOperation({
    summary: "A rider gives back a delivery they haven't left with",
  })
  giveBack(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.giveBack(user, orderId);
  }

  @Patch(':orderId/delivered')
  @AnyEmployee()
  @ApiOperation({
    summary: 'Mark delivered, with the money taken at the door if not paid',
  })
  delivered(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: DeliveredDto,
  ) {
    return this.service.delivered(user, orderId, dto);
  }

  @Patch(':orderId/arrived')
  @AnyEmployee()
  @ApiOperation({
    summary: "The rider is at the customer's door (with their position)",
  })
  arrived(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: ArrivedDto,
  ) {
    return this.service.arrived(user, orderId, dto);
  }

  @Patch(':orderId/code-sent')
  @AnyEmployee()
  @ApiOperation({
    summary: 'The till sent the customer their delivery code',
  })
  codeSent(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: CodeSentDto,
  ) {
    return this.service.codeSent(user, orderId, dto);
  }

  @Post(':orderId/send-code')
  @AnyEmployee()
  @ApiOperation({
    summary:
      'Send the customer their code by SMS from the server (503 if SMS is not set up)',
  })
  sendCode(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.sendCode(user, orderId);
  }

  @Post(':orderId/proof-photo')
  @AnyEmployee()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FileUploadInterceptor('photo', 1, false))
  @ApiOperation({
    summary: 'Photo of the handover, for a delivery finished without the code',
  })
  proofPhoto(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.service.proofPhoto(user, orderId, photo);
  }

  @Patch(':orderId/not-delivered')
  @AnyEmployee()
  @ApiOperation({ summary: "Mark a delivery that couldn't be made" })
  notDelivered(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: NotDeliveredDto,
  ) {
    return this.service.notDelivered(user, orderId, dto);
  }
}
