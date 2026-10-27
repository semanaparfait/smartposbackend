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
} from '@nestjs/common';
import { CartService } from './cart.service';
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

@ApiTags('Carts')
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
  async findCarts(
    @User() user: Payload,
    @Query('companyId') companyId?: string,
  ) {
    return await this.service.findCarts(user, companyId);
  }

  @Patch(':cartId/checkout')
  @ApiOperation({ summary: 'Checkout cart' })
  async checkout(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    return await this.service.checkout(user, cartId);
  }

  @Delete(':cartId/abandon')
  @ApiOperation({ summary: 'Abandon cart' })
  async abandon(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    await this.service.abandon(user, cartId);

    return { message: 'Cart removed' };
  }
}
