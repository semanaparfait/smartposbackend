import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { CreateProductCategoryDto } from './dto/request/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/request/update-product-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { FileService } from '../file/file.service';
import { FileType } from '../file/entities/file.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    private fileService: FileService,
  ) {}

  // ---------------- CATEGORY ----------------

  async createCategory(
    dto: CreateProductCategoryDto,
    picture: Express.Multer.File,
  ) {
    const category = await this.categoryRepo.save(dto);
    await this.fileService.save(picture, FileType.IMAGE, category);
    return category;
  }

  async getCategories() {
    return this.categoryRepo.find({
      relations: { image: true },
    });
  }

  async getCategory(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: { image: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    return category;
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    const category = await this.getCategory(id);

    Object.assign(category, dto);

    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.getCategory(id);
    await this.categoryRepo.remove(category);
  }

  // ---------------- PRODUCT ----------------

  async createProduct(dto: CreateProductDto, picture: Express.Multer.File) {
    return await this.productRepo.manager.transaction(async (manager) => {
      const product = this.productRepo.create({
        ...dto,
        category: dto.categoryId ? ({ id: dto.categoryId } as any) : null,
      });

      await this.productRepo.save(product);

      await this.fileService.save(picture, FileType.IMAGE, product);

      return await this.getProduct({ id: product.id });
    });
  }

  async getProducts() {
    return this.productRepo.find({
      relations: { category: true, images: true },
    });
  }

  async getProduct(where: FindOptionsWhere<Product>) {
    const product = await this.findOne(where);

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async findOne(where: FindOptionsWhere<Product>) {
    return await this.productRepo.findOne({
      where,
      relations: { category: true, images: true },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.getProduct({ id });

    Object.assign(product, dto);

    if (dto.categoryId) {
      product.category = {
        id: dto.categoryId,
      } as any;
    }

    return this.productRepo.save(product);
  }

  async deactivateProduct(id: string) {
    const product = await this.getProduct({ id });

    product.active = false;

    return this.productRepo.save(product);
  }

  async activateProduct(id: string) {
    const product = await this.getProduct({ id });

    product.active = true;

    return this.productRepo.save(product);
  }
}
