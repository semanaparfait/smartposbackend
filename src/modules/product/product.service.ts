import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { SaveRecipeDto } from './dto/request/save-recipe.dto';
import { RecordWasteDto } from './dto/request/record-waste.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateProductCategoryDto } from './dto/request/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/request/update-product-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { RestockProductDto } from './dto/request/restock-product.dto';
import { StockMovementReasonEnum } from './entities/stock-movement.entity';
import { OPENING_STOCK_NOTE, StockService } from './stock.service';
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

    @InjectRepository(RecipeItem)
    private recipeRepo: Repository<RecipeItem>,

    private fileService: FileService,

    private stockService: StockService,

    private realtime: RealtimeService,
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
    picture?: Express.Multer.File,
  ) {
    const companyId = targetCompanyId(user, dto.companyId);
    const {
      companyId: _companyId,
      categoryId,
      stockQuantity,
      pictureUrl,
      ...fields
    } = dto;
    const image = picture ?? pictureUrl;

    // Ingredients never appear on the till, so they don't need one.
    if (!image && !dto.isIngredient)
      throw new BadRequestException('Please add a product picture');

    if (stockQuantity) requirePermission(user, 'inventory.adjust');

    if (categoryId) await this.getCompanyCategory(categoryId, companyId);

    await this.assertCodesFree(companyId, dto);

    const product = await this.fileService.createWithImage(image, () =>
      this.productRepo.manager.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(Product, {
            ...fields,
            company: { id: companyId },
            ...(categoryId ? { category: { id: categoryId } } : {}),
          }),
        );

        if (stockQuantity)
          await this.countStock(
            manager,
            user,
            created.id,
            stockQuantity,
            0,
            OPENING_STOCK_NOTE,
          );

        return created;
      }),
    );

    return await this.getProduct({ id: product.id });
  }

  async getProducts(user: Payload, companyId?: string) {
    const products = await this.productRepo.find({
      where: companyWhere(user, companyId),
      relations: { category: true, images: true },
    });

    return this.stockService.attachCanMake(products);
  }

  // A product as the app shows it, with how many can be made.
  async viewProduct(user: Payload, id: string) {
    const product = await this.getProduct({ id, ...companyWhere(user) });
    const [viewed] = await this.stockService.attachCanMake([product]);

    return viewed;
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
    const {
      categoryId,
      picture: _picture,
      pictureUrl,
      stockQuantity,
      ...fields
    } = dto;
    const image = picture ?? pictureUrl;
    const stockChanged =
      stockQuantity !== undefined &&
      stockQuantity !== Number(product.stockQuantity);

    if (stockChanged) requirePermission(user, 'inventory.adjust');

    // Either change would leave a recipe that no longer means anything.
    if (dto.isIngredient === false && product.isIngredient) {
      if (await this.recipeRepo.existsBy({ ingredient: { id } }))
        throw new BadRequestException(
          'This ingredient is used in a recipe. Remove it from there first',
        );
    }

    if (dto.isIngredient === true && !product.isIngredient) {
      if (await this.recipeRepo.existsBy({ product: { id } }))
        throw new BadRequestException(
          'This product has a recipe. Clear the recipe first',
        );
    }

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

    if (image) await this.fileService.replaceImage(image, product);

    return this.getProduct({ id: product.id });
  }

  searchImages(query: string) {
    const term = query?.trim();

    if (!term || term.length < 2)
      throw new BadRequestException('Type at least 2 letters to search');

    return this.fileService.searchImages(term.slice(0, 100));
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

    await this.productRepo.manager.transaction(async (manager) => {
      await this.stockService.apply(manager, {
        productId: id,
        change: dto.quantity,
        reason: StockMovementReasonEnum.RESTOCK,
        userId: user.sub,
        note: dto.note,
      });

      // The newest delivery sets the cost recipes are priced at.
      if (dto.unitCost !== undefined || dto.expiryDate)
        await manager.update(Product, id, {
          ...(dto.unitCost !== undefined ? { buyingPrice: dto.unitCost } : {}),
          ...(dto.expiryDate ? { expiryDate: dto.expiryDate } : {}),
        });
    });

    return this.getProduct({ id });
  }

  // Stock lost to spoilage or spills, kept apart from counts and sales so the owner
  // can see why it dropped. More than is in stock is taken for a typing mistake.
  async recordWaste(user: Payload, id: string, dto: RecordWasteDto) {
    const product = await this.getProduct({ id, ...companyWhere(user) });

    if (!product.trackStock)
      throw new BadRequestException(
        'Turn on stock tracking for this product first',
      );

    if (dto.quantity > Number(product.stockQuantity))
      throw new BadRequestException(
        `Only ${Number(product.stockQuantity)} ${product.unit} in stock`,
      );

    const low = await this.productRepo.manager.transaction((manager) =>
      this.stockService.recordWaste(
        manager,
        id,
        dto.quantity,
        dto.reason,
        user.sub,
      ),
    );

    this.realtime.stockLow(product.company.id, low);

    return this.getProduct({ id });
  }

  // The products whose recipes use this ingredient.
  async getUsedIn(user: Payload, id: string) {
    await this.getProduct({ id, ...companyWhere(user) });

    const lines = await this.recipeRepo.find({
      where: { ingredient: { id } },
      relations: { product: true },
    });

    return lines.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: Number(line.quantity),
    }));
  }

  async getRecipe(user: Payload, id: string) {
    await this.getProduct({ id, ...companyWhere(user) });

    const lines = await this.recipeRepo.find({
      where: { product: { id } },
      relations: { ingredient: true },
    });

    return lines.map((line) => ({
      ingredientId: line.ingredient.id,
      quantity: Number(line.quantity),
    }));
  }

  // Replaces the whole recipe. Only this company's ingredients can be used.
  async saveRecipe(user: Payload, id: string, dto: SaveRecipeDto) {
    const product = await this.getProduct({ id, ...companyWhere(user) });

    if (product.isIngredient)
      throw new BadRequestException('An ingredient cannot have a recipe');

    const ids = dto.items.map((line) => line.ingredientId);
    const found = await this.productRepo.countBy({
      id: In(ids),
      isIngredient: true,
      company: { id: product.company.id },
    });

    if (found !== ids.length)
      throw new BadRequestException('Choose ingredients from your own stock');

    await this.recipeRepo.manager.transaction(async (manager) => {
      await manager.delete(RecipeItem, { product: { id } });

      if (!dto.items.length) return;

      await manager.insert(
        RecipeItem,
        dto.items.map((line) => ({
          product: { id },
          ingredient: { id: line.ingredientId },
          quantity: line.quantity,
        })),
      );
    });

    return this.getRecipe(user, id);
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
    note?: string,
  ) {
    return this.stockService.apply(manager, {
      productId,
      change: counted - current,
      reason: StockMovementReasonEnum.ADJUSTMENT,
      userId: user.sub,
      note,
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
