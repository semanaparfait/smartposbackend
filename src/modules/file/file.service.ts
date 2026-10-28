import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiResponse, v2 } from 'cloudinary';
import { File, FileType } from './entities/file.entity';
import fs from 'fs';
import path from 'path';
import { ProductCategory } from '../product/entities/product-category.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../user/entities/user.entity';
import { Payload } from 'src/util/token.service';
import { companyWhere, isSuperAdmin } from 'src/common/utils/company-scope';

export type ImageOwner = ProductCategory | Product | Employee | User;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Longest side kept for stored originals; phone photos are often 4000px+.
const MAX_STORED_SIZE = 1600;

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    try {
      return await v2.uploader.upload(file.path, {
        folder: 'pos',
        // Without the extension, otherwise Cloudinary URLs end in ".jpg.jpg".
        public_id: path.parse(file.filename).name,
        resource_type: 'image',
        overwrite: false,
        transformation: [
          { width: MAX_STORED_SIZE, height: MAX_STORED_SIZE, crop: 'limit' },
        ],
      });
    } catch (error) {
      this.logger.error(`Cloudinary upload failed: ${errorMessage(error)}`);
      throw new BadGatewayException('Image upload failed, please try again');
    } finally {
      this.removeTemp(file);
    }
  }

  async deleteFile(publicId: string, resourceType: string): Promise<void> {
    const { result } = (await v2.uploader.destroy(publicId, {
      resource_type: resourceType,
    })) as { result?: string };

    if (result !== 'ok' && result !== 'not found')
      throw new Error(`Cloudinary delete failed: ${result}`);
  }

  // Creates a record together with its picture. The picture is uploaded first, so a
  // failed upload leaves no record without its image; if creating the record fails
  // afterwards, the uploaded image is removed again.
  async createWithImage<T extends ImageOwner>(
    picture: Express.Multer.File | undefined,
    create: () => Promise<T>,
  ): Promise<T> {
    const uploaded = picture ? await this.uploadFile(picture) : undefined;

    try {
      const entity = await create();
      if (uploaded) await this.attach(uploaded, entity);
      return entity;
    } catch (error) {
      if (uploaded) await this.deleteQuietly(uploaded.public_id, 'image');
      throw error;
    }
  }

  // Replaces the record's current picture(s) with a new one. Old rows go first (a
  // category or employee may only have one picture) in the same transaction, so a
  // failure keeps the old picture.
  async replaceImage(picture: Express.Multer.File, entity: ImageOwner) {
    const uploaded = await this.uploadFile(picture);
    let old: File[] = [];

    try {
      await this.fileRepo.manager.transaction(async (manager) => {
        const repo = manager.getRepository(File);
        old = await repo.find({ where: this.ownerWhere(entity) });
        if (old.length) await repo.remove(old);
        await this.attach(uploaded, entity, repo);
      });
    } catch (error) {
      await this.deleteQuietly(uploaded.public_id, 'image');
      throw error;
    }

    await this.deleteFromStorage(old);
  }

  // Uploads an image that is referenced by URL only (e.g. a company logo) and
  // returns its optimized delivery link.
  async uploadImage(file: Express.Multer.File, transformation: string) {
    const uploaded = await this.uploadFile(file);
    return uploaded.secure_url.replace(
      '/upload/',
      `/upload/${transformation}/`,
    );
  }

  // Deletes an image uploaded by uploadImage, given its link. Links that aren't
  // ours (another Cloudinary account, any other site) are left alone.
  async deleteByUrl(url: string | null | undefined) {
    const cloud = v2.config().cloud_name;
    const match = url?.match(
      /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:[^/]*,[^/]*\/)*(?:v\d+\/)?(pos\/[^.]+)/,
    );

    if (match && match[1] === cloud)
      await this.deleteQuietly(match[2], 'image');
  }

  // Cloudinary assets of a record about to be deleted (its file rows go by cascade).
  async findImages(entity: ImageOwner) {
    return this.fileRepo.find({ where: this.ownerWhere(entity) });
  }

  async deleteFromStorage(files: File[]) {
    await Promise.all(files.map((f) => this.deleteQuietly(f.name, f.type)));
  }

  // A file can only be removed by its owner's company (or a super admin).
  async remove(user: Payload, id: string) {
    const scope = companyWhere(user);
    const file = await this.fileRepo.findOne({
      where: isSuperAdmin(user)
        ? { id }
        : [
            { id, product: scope },
            { id, category: scope },
            { id, employee: scope },
            { id, user: scope },
          ],
    });

    if (!file) throw new NotFoundException('File not found');

    await this.fileRepo.remove(file);
    await this.deleteQuietly(file.name, file.type);
  }

  private async attach(
    uploaded: UploadApiResponse,
    entity: ImageOwner,
    repo: Repository<File> = this.fileRepo,
  ) {
    return repo.save(
      repo.create({
        originalUrl: uploaded.secure_url,
        name: uploaded.public_id,
        type: FileType.IMAGE,
        mimeType: `image/${uploaded.format}`,
        size: uploaded.bytes,
        ...this.ownerWhere(entity),
      }),
    );
  }

  private ownerWhere(entity: ImageOwner) {
    return entity instanceof Product
      ? { product: { id: entity.id } }
      : entity instanceof Employee
        ? { employee: { id: entity.id } }
        : entity instanceof User
          ? { user: { id: entity.id } }
          : { category: { id: entity.id } };
  }

  // Storage cleanup must never fail the request that triggered it.
  private async deleteQuietly(publicId: string, resourceType: string) {
    try {
      await this.deleteFile(publicId, resourceType);
    } catch (error) {
      this.logger.warn(`Could not delete ${publicId}: ${errorMessage(error)}`);
    }
  }

  private removeTemp(file: Express.Multer.File) {
    if (file.path)
      fs.unlink(file.path, (err) => {
        if (err && err.code !== 'ENOENT')
          this.logger.warn(`Failed to delete temp file: ${err.message}`);
      });
  }
}
