import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Delete,
  Get,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async createCart(@Body() dto: CreateCartDto) {
    return await this.service.createCart(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get carts' })
  async findCarts() {
    return await this.service.findCarts();
  }

  @Patch(':cartId/checkout')
  @ApiOperation({ summary: 'Checkout cart' })
  async checkout(@User() user: Payload, @Param() { cartId }: CartIdParam) {
    return await this.service.checkout(user.sub, cartId);
  }

  @Delete(':cartId/abandon')
  @ApiOperation({ summary: 'Abandon cart' })
  async abandon(@Param() { cartId }: CartIdParam) {
    await this.service.abandon(cartId);

    return { message: 'Cart removed' };
  }
}
