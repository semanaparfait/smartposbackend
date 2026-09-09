import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  AddCartItemByCodeDto,
  AddCartItemByIdDto,
} from './dto/request/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/request/update-cart-item.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CartIdParam } from '../cart/dto/request/cart-param.dto';
import { ItemIdParam } from './dto/request/item-param.dto';

@Controller('items')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE)
@ApiBearerAuth()
export class ItemController {
  constructor(private readonly service: ItemService) {}

  @Post(':cartId/item/productId')
  @ApiOperation({ summary: 'Add item to cart by Id' })
  async addItemById(
    @Param() { cartId }: CartIdParam,
    @Body() dto: AddCartItemByIdDto,
  ) {
    await this.service.addItemById(cartId, dto);

    return { message: 'Item added from cart' };
  }

  @Post(':cartId/item/productCode')
  @ApiOperation({ summary: 'Add item to cart by BarCode' })
  async addItemByCode(
    @Param() { cartId }: CartIdParam,
    @Body() dto: AddCartItemByCodeDto,
  ) {
    await this.service.addItemByCode(cartId, dto);

    return { message: 'Item added from cart' };
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Update item quantity' })
  async updateItem(
    @Param() { itemId }: ItemIdParam,
    @Body() dto: UpdateCartItemDto,
  ) {
    await this.service.updateItemQuantity(itemId, dto.quantity);

    return { message: 'Item updated from cart' };
  }

  @Delete(':itemId/delete')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@Param() { itemId }: ItemIdParam) {
    await this.service.removeItem(itemId);

    return { message: 'Item removed from cart' };
  }
}
