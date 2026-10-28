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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AddCartItemByCodeDto,
  AddCartItemByIdDto,
} from './dto/request/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/request/update-cart-item.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { CartIdParam } from '../cart/dto/request/cart-param.dto';
import { ItemIdParam } from './dto/request/item-param.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Cart Items')
@RequirePermissions('sales.create')
@Controller('items')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE)
@ApiBearerAuth()
export class ItemController {
  constructor(private readonly service: ItemService) {}

  @Post(':cartId/item/productId')
  @ApiOperation({ summary: 'Add item to cart by Id' })
  async addItemById(
    @User() user: Payload,
    @Param() { cartId }: CartIdParam,
    @Body() dto: AddCartItemByIdDto,
  ) {
    const cart = await this.service.addItemById(user, cartId, dto);

    return { message: 'Item added to cart', cart };
  }

  @Post(':cartId/item/productCode')
  @ApiOperation({ summary: 'Add item to cart by BarCode' })
  async addItemByCode(
    @User() user: Payload,
    @Param() { cartId }: CartIdParam,
    @Body() dto: AddCartItemByCodeDto,
  ) {
    const cart = await this.service.addItemByCode(user, cartId, dto);

    return { message: 'Item added to cart', cart };
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Update item quantity' })
  async updateItem(
    @User() user: Payload,
    @Param() { itemId }: ItemIdParam,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.service.updateItemQuantity(
      user,
      itemId,
      dto.quantity,
    );

    return { message: 'Item updated', cart };
  }

  @Delete(':itemId/delete')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@User() user: Payload, @Param() { itemId }: ItemIdParam) {
    const cart = await this.service.removeItem(user, itemId);

    return { message: 'Item removed from cart', cart };
  }
}
