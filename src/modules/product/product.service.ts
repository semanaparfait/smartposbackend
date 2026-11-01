import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { CreateProductCategoryDto } from './dto/request/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/request/update-product-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { RestockProductDto } from './dto/request/restock-product.dto';
import { StockMovementReasonEnum } from './entities/stock-movement.entity';
import { StockService } from './stock.service';
import { FileService } from '../file/file.service';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';
import { requirePermission } from 'src/common/permissions/permissions';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    private fileService: FileService,

    private stockService: StockService,
  ) {}

  // ---------------- CATEGORY ----------------

  async createCategory(
    user: Payload,
    dto: CreateProductCategoryDto,
    picture: Express.Multer.File,
  ) {
    const companyId = targetCompanyId(user, dto.companyId);

    const category = await this.fileService.createWithImage(picture, () =>
      this.categoryRepo.save(
        this.categoryRepo.create({
          name: dto.name,
          company: { id: companyId },
        }),
      ),
    );

    return this.getCategory(user, category.id);
  }

  async getCategories(user: Payload, companyId?: string) {
    return this.categoryRepo.find({
      where: companyWhere(user, companyId),
      relations: { image: true },
    });
  }

  async getCategory(user: Payload, id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { image: true, company: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    return category;
  }

  async updateCategory(
    user: Payload,
    id: string,
    dto: UpdateProductCategoryDto,
    picture?: Express.Multer.File,
  ) {
    const category = await this.getCategory(user, id);

    if (dto.name !== undefined) category.name = dto.name;

    await this.categoryRepo.save(category);

    if (picture) await this.fileService.replaceImage(picture, category);

    return this.getCategory(user, id);
  }

  async deleteCategory(user: Payload, id: string) {
    const category = await this.getCategory(user, id);

    const products = await this.productRepo.count({
      where: { category: { id } },
    });

    if (products)
      throw new ConflictException(
        `Category still has ${products} product(s); move them to another category first`,
      );

    const images = await this.fileService.findImages(category);

    await this.categoryRepo.remove(category);
    await this.fileService.deleteFromStorage(images);
  }

  // ---------------- PRODUCT ----------------

  async createProduct(
    user: Payload,
    dto: CreateProductDto,
    picture: Express.Multer.File,
  ) {
    const companyId = targetCompanyId(user, dto.companyId);
    const { companyId: _companyId, categoryId, stockQuantity, ...fields } = dto;

    if (stockQuantity) requirePermission(user, 'inventory.adjust');

    if (categoryId) await this.getCompanyCategory(categoryId, companyId);

    await this.assertCodesFree(companyId, dto);

    const product = await this.fileService.createWithImage(picture, () =>
      this.productRepo.manager.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(Product, {
            ...fields,
            company: { id: companyId },
            ...(categoryId ? { category: { id: categoryId } } : {}),
          }),
        );

        if (stockQuantity)
          await this.countStock(manager, user, created.id, stockQuantity, 0);

        return created;
      }),
    );

    return await this.getProduct({ id: product.id });
  }

  async getProducts(user: Payload, companyId?: string) {
    return this.productRepo.find({
      where: companyWhere(user, companyId),
      relations: { category: true, images: true },
    });
  }

  // When called on behalf of a user, `where` must include the company scope.
  async getProduct(where: FindOptionsWhere<Product>) {
    const product = await this.findOne(where);

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async findOne(where: FindOptionsWhere<Product>) {
    return await this.productRepo.findOne({
      where,
      relations: { category: true, images: true, company: true },
    });
  }

  async updateProduct(
    user: Payload,
    id: string,
    dto: UpdateProductDto,
    picture?: Express.Multer.File,
  ) {
    const product = await this.getProduct({ id, ...companyWhere(user) });
    const { categoryId, picture: _picture, stockQuantity, ...fields } = dto;
    const stockChanged =
      stockQuantity !== undefined &&
      stockQuantity !== Number(product.stockQuantity);

    if (stockChanged) requirePermission(user, 'inventory.adjust');

    await this.assertCodesFree(product.company.id, dto, id);

    Object.assign(product, fields);

    if (categoryId) {
      product.category = await this.getCompanyCategory(
        categoryId,
        product.company.id,
      );
    }

    // Saved without the loaded images so TypeORM doesn't touch the files table, and
    // without the stock so a sale happening now isn't overwritten.
    const {
      images: _images,
      stockQuantity: currentStock,
      ...changes
    } = product;

    await this.productRepo.manager.transaction(async (manager) => {
      await manager.save(Product, changes);

      if (stockChanged)
        await this.countStock(
          manager,
          user,
          id,
          stockQuantity,
          Number(currentStock),
        );
    });

    if (picture) await this.fileService.replaceImage(picture, product);

    return this.getProduct({ id: product.id });
  }

  async deactivateProduct(user: Payload, id: string) {
    const product = await this.getProduct({ id, ...companyWhere(user) });

    product.active = false;

    return this.productRepo.save(product);
  }

  async activateProduct(user: Payload, id: string) {
    const product = await this.getProduct({ id, ...companyWhere(user) });

    product.active = true;

    return this.productRepo.save(product);
  }

  // Stock arriving, e.g. a delivery.
  async restock(user: Payload, id: string, dto: RestockProductDto) {
    await this.getProduct({ id, ...companyWhere(user) });

    await this.productRepo.manager.transaction((manager) =>
      this.stockService.apply(manager, {
        productId: id,
        change: dto.quantity,
        reason: StockMovementReasonEnum.RESTOCK,
        userId: user.sub,
        note: dto.note,
      }),
    );

    return this.getProduct({ id });
  }

  async getStockMovements(
    user: Payload,
    id: string,
    page?: number,
    limit?: number,
  ) {
    await this.getProduct({ id, ...companyWhere(user) });

    return this.stockService.getMovements(id, page, limit);
  }

  // helpers

  // A counted figure replaces the old one: recorded as the difference.
  private countStock(
    manager: EntityManager,
    user: Payload,
    productId: string,
    counted: number,
    current: number,
  ) {
    return this.stockService.apply(manager, {
      productId,
      change: counted - current,
      reason: StockMovementReasonEnum.ADJUSTMENT,
      userId: user.sub,
    });
  }

  // The database also refuses duplicates; this says which one.
  private async assertCodesFree(
    companyId: string,
    { barCode, sku }: { barCode?: string | null; sku?: string | null },
    exceptId?: string,
  ) {
    const scope = {
      company: { id: companyId },
      ...(exceptId ? { id: Not(exceptId) } : {}),
    };

    if (barCode && (await this.productRepo.existsBy({ ...scope, barCode })))
      throw new ConflictException('Another product already has this barcode');

    if (sku && (await this.productRepo.existsBy({ ...scope, sku })))
      throw new ConflictException('Another product already has this SKU');
  }

  // A product may only be filed under a category of its own company.
  private async getCompanyCategory(categoryId: string, companyId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, company: { id: companyId } },
    });

    if (!category) throw new NotFoundException('Category not found');

    return category;
  }
}
