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

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Get()
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
  @Roles(UserRole.EMPLOYEE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get order by id' })
  getOrder(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.getOrder(user, orderId);
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Change order status' })
  changeStatus(
    @User() user: Payload,
    @Param() { orderId }: OrderIdParam,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.changeStatus(user, orderId, dto.status);
  }

  @Patch(':orderId/complete')
  @ApiOperation({ summary: 'Complete order' })
  completeOrder(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.completeOrder(user, orderId);
  }

  @Patch(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancelOrder(@User() user: Payload, @Param() { orderId }: OrderIdParam) {
    return this.service.cancelOrder(user, orderId);
  }
}
