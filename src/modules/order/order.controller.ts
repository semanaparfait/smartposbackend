import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateOrderStatusDto } from './dto/request/update-order-status.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { OrderIdParam } from './dto/request/order-param.dto';
import { CompleteOrderDto } from './dto/request/complete-order.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Get()
  @RequirePermissions('orders.view_own')
  @Roles(UserRole.EMPLOYEE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getOrders(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getOrders(user, companyId);
  }

  @Get(':orderId')
  @RequirePermissions('orders.view_own')
  @Roles(UserRole.EMPLOYEE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get order by id' })
  getOrder(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.viewOrder(user, orderId);
  }

  @Patch(':orderId/status')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Change order status' })
  changeStatus(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.changeStatus(user, orderId, dto.status);
  }

  @Patch(':orderId/complete')
  @RequirePermissions('sales.checkout')
  @ApiOperation({ summary: 'Complete order and record its payments' })
  completeOrder(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: CompleteOrderDto,
  ) {
    return this.service.completeOrder(user, orderId, dto);
  }

  @Patch(':orderId/cancel')
  @RequirePermissions('sales.cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancelOrder(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.cancelOrder(user, orderId);
  }
}
