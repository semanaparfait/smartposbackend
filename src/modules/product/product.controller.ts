import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductCategoryDto } from './dto/request/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/request/update-product-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { companyWhere } from 'src/common/utils/company-scope';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { ProductIdParam } from './dto/request/product-param.dto';
import { ProductCategoryIdParam } from './dto/request/product-category-param.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Products & Categories')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@Controller()
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly service: ProductService) {}

  // ---------------- CATEGORY ----------------

  @Post('categories')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Create category' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  createCategory(
    @User() user: Payload,
    @Body() dto: CreateProductCategoryDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createCategory(user, dto, picture);
  }

  @Get('categories')
  @AnyEmployee()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getCategories(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getCategories(user, companyId);
  }

  @Get('categories/:categoryId')
  @AnyEmployee()
  @ApiOperation({ summary: 'Get category by id' })
  getCategory(
    @User() user: Payload,
    @Param() { categoryId }: ProductCategoryIdParam,
  ) {
    return this.service.getCategory(user, categoryId);
  }

  @Patch('categories/:categoryId')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Update category (send picture to replace it)' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiConsumes('multipart/form-data', 'application/json')
  updateCategory(
    @User() user: Payload,
    @Param() { categoryId }: ProductCategoryIdParam,
    @Body() dto: UpdateProductCategoryDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.service.updateCategory(user, categoryId, dto, picture);
  }

  @Delete('categories/:categoryId/delete')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(
    @User() user: Payload,
    @Param() { categoryId }: ProductCategoryIdParam,
  ) {
    return this.service.deleteCategory(user, categoryId);
  }

  // ---------------- PRODUCT ----------------

  @Post('products')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Create product' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  async createProduct(
    @User() user: Payload,
    @Body() dto: CreateProductDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createProduct(user, dto, picture);
  }

  @Get('products')
  @AnyEmployee()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getProducts(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getProducts(user, companyId);
  }

  @Get('products/:productId')
  @AnyEmployee()
  @ApiOperation({ summary: 'Get product by id' })
  getProduct(@User() user: Payload, @Param() { productId }: ProductIdParam) {
    return this.service.getProduct({ id: productId, ...companyWhere(user) });
  }

  @Patch('products/:productId')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Update product (send picture to replace it)' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiConsumes('multipart/form-data', 'application/json')
  updateProduct(
    @User() user: Payload,
    @Param() { productId }: ProductIdParam,
    @Body() dto: UpdateProductDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.service.updateProduct(user, productId, dto, picture);
  }

  @Patch('products/:productId/deactivate')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Deactivate product' })
  deactivate(@User() user: Payload, @Param() { productId }: ProductIdParam) {
    return this.service.deactivateProduct(user, productId);
  }

  @Patch('products/:productId/activate')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Activate product' })
  activate(@User() user: Payload, @Param() { productId }: ProductIdParam) {
    return this.service.activateProduct(user, productId);
  }
}
