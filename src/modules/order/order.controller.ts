import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { UpdateOrderDto } from './dto/request/update-order.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  getOrders(@User() user: Payload) {
    return this.service.getOrders(user.sub);
  }

  @Get(':orderId')
  @Roles(UserRole.EMPLOYEE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get order by id' })
  getOrder(@Param() { orderId }: OrderIdParam) {
    return this.service.getOrder(orderId);
  }

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Change order status' })
  changeStatus(
    @Param() { orderId }: OrderIdParam,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.changeStatus(orderId, dto.status);
  }

  @Patch(':orderId/complete')
  @ApiOperation({ summary: 'Complete order' })
  completeOrder(@Param() { orderId }: OrderIdParam) {
    return this.service.completeOrder(orderId);
  }

  @Patch(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancelOrder(@Param() { orderId }: OrderIdParam) {
    return this.service.cancelOrder(orderId);
  }
}
