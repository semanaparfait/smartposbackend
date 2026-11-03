import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
  Get,
  ParseEnumPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CartStatusEnum } from './entities/cart.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { UserRole } from '../user/entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateCartDto } from './dto/request/create-cart.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { CartIdParam } from './dto/request/cart-param.dto';
import { ExtendHoldDto, HoldCartDto } from './dto/request/hold-cart.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { DeviceTypes } from 'src/common/decorators/device-types.decorator';
import { DeviceTypeEnum } from '../device/entities/device.entity';

@ApiTags('Carts')
@DeviceTypes(DeviceTypeEnum.POS_TERMINAL)
@RequirePermissions('sales.create')
@Controller('carts')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create cart' })
  async createCart(@User() user: Payload, @Body() dto: CreateCartDto) {
    return await this.service.createCart(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get carts' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CartStatusEnum,
    description: 'Only carts in this status (omit for all)',
  })
  async findCarts(
    @User() user: Payload,
    @Query('companyId') companyId?: string,
    @Query('status', new ParseEnumPipe(CartStatusEnum, { optional: true }))
    status?: CartStatusEnum,
  ) {
    return await this.service.findCarts(user, companyId, status);
  }

  @Patch(':cartId/checkout')
  @ApiOperation({ summary: 'Checkout cart' })
  async checkout(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    return await this.service.checkout(user, cartId);
  }

  @Patch(':cartId/hold')
  @ApiOperation({ summary: 'Hold a sale while the customer is away' })
  async hold(
    @User() user: Payload,
    @Param() { cartId }: CartIdParam,
    @Body() dto: HoldCartDto,
  ) {
    return await this.service.hold(user, cartId, dto);
  }

  @Patch(':cartId/hold/extend')
  @ApiOperation({ summary: 'Wait longer for a held sale' })
  async extendHold(
    @User() user: Payload,
    @Param() { cartId }: CartIdParam,
    @Body() dto: ExtendHoldDto,
  ) {
    return await this.service.extendHold(user, cartId, dto);
  }

  @Patch(':cartId/resume')
  @ApiOperation({ summary: 'Bring a held sale back to the till' })
  async resume(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    return await this.service.resume(user, cartId);
  }

  @Delete(':cartId/abandon')
  @ApiOperation({ summary: 'Abandon cart' })
  async abandon(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    await this.service.abandon(user, cartId);

    return { message: 'Cart removed' };
  }
}
