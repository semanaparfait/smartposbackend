import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiResponse, v2 } from 'cloudinary';
import { File, FileType } from './entities/file.entity';
import fs from 'fs';
import { ProductCategory } from '../product/entities/product-category.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
  ) {}

  async uploadFile(file: {
    path: string;
    filename: string;
  }): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const { path: filePath, filename } = file;

      v2.uploader.upload(
        filePath,
        {
          folder: 'pos',
          public_id: filename,
          resource_type: 'auto',
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);

          if (!result)
            return reject(
              new NotImplementedException('Cloudinary upload failed'),
            );
          resolve(result);
        },
      );
    });
  }

  deleteFile(url: string, resourceType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      void v2.uploader.destroy(
        url,
        { resource_type: resourceType },
        (error, result) => {
          if (error) return reject(error);

          if (result?.result !== 'ok') {
            return reject(
              new Error(`Cloudinary delete failed: ${result?.result}`),
            );
          }

          resolve();
        },
      );
    });
  }

  async save(
    files: Express.Multer.File | Express.Multer.File[],
    fileType: FileType,
    entity: ProductCategory | Product | Employee,
  ): Promise<File | File[]> {
    const fileArray = Array.isArray(files) ? files : [files];

    const savedFiles = await Promise.all(
      fileArray.map(async (file) => {
        const res = await this.uploadFile(file);

        const fileEntity = this.fileRepo.create({
          url: res.url,
          name: res.public_id,
          type: fileType,
          mimeType: res.type,
          size: res.bytes,
          ...(entity instanceof Product
            ? { product: { id: entity.id } }
            : entity instanceof Employee
              ? { employee: { id: entity.id } }
              : { category: { id: entity.id } }),
        });

        const savedFile = await this.fileRepo.save(fileEntity);

        if (file.path) {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.error('Failed to delete temp file:', err);
            }
          });
        }

        return savedFile;
      }),
    );

    return Array.isArray(files) ? savedFiles : savedFiles[0];
  }

  async remove(id: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    await this.deleteFile(file.name, file.type);
    await this.fileRepo.delete(id);
  }
}
