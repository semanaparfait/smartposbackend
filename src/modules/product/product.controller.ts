import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductCategoryDto } from './dto/request/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/request/update-product-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { Public } from 'src/common/decorators/public.decorator';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { ProductIdParam } from './dto/request/product-param.dto';
import { ProductCategoryIdParam } from './dto/request/product-category-param.dto';

@ApiTags('Products & Categories')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@Controller()
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly service: ProductService) {}

  // ---------------- CATEGORY ----------------

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  createCategory(
    @Body() dto: CreateProductCategoryDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createCategory(dto, picture);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:categoryId')
  @ApiOperation({ summary: 'Get category by id' })
  getCategory(@Param() { categoryId }: ProductCategoryIdParam) {
    return this.service.getCategory(categoryId);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(
    @Param() { categoryId }: ProductCategoryIdParam,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.service.updateCategory(categoryId, dto);
  }

  @Delete('categories/:categoryId/delete')
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Param() { categoryId }: ProductCategoryIdParam) {
    return this.service.deleteCategory(categoryId);
  }

  // ---------------- PRODUCT ----------------

  @Post('products')
  @ApiOperation({ summary: 'Create product' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  async createProduct(
    @Body() dto: CreateProductDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createProduct(dto, picture);
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  getProducts() {
    return this.service.getProducts();
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get product by id' })
  getProduct(@Param() { productId }: ProductIdParam) {
    return this.service.getProduct({ id: productId });
  }

  @Patch('products/:productId')
  @ApiOperation({ summary: 'Update product' })
  updateProduct(
    @Param() { productId }: ProductIdParam,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.updateProduct(productId, dto);
  }

  @Patch('products/:productId/deactivate')
  @ApiOperation({ summary: 'Deactivate product' })
  deactivate(@Param() { productId }: ProductIdParam) {
    return this.service.deactivateProduct(productId);
  }

  @Patch('products/:productId/activate')
  @ApiOperation({ summary: 'Activate product' })
  activate(@Param() { productId }: ProductIdParam) {
    return this.service.activateProduct(productId);
  }
}
