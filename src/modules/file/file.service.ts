import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiResponse, v2 } from 'cloudinary';
import { File, FileType } from './entities/file.entity';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ProductCategory } from '../product/entities/product-category.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { requirePermission } from 'src/common/permissions/permissions';
import { Payload } from 'src/util/token.service';
import { companyWhere, isSuperAdmin } from 'src/common/utils/company-scope';

export type ImageOwner = ProductCategory | Product | Employee | User;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Longest side kept for stored originals; phone photos are often 4000px+.
const MAX_STORED_SIZE = 1600;

// An uploaded file, or a link to a picture found by image search.
export type ImageSource = Express.Multer.File | string;

export interface ImageResult {
  url: string;
  thumbnail: string;
  title: string;
  license: string | null;
  author: string | null;
}

interface CommonsResponse {
  query?: {
    pages?: Record<
      string,
      {
        index?: number;
        title: string;
        imageinfo?: {
          thumburl?: string;
          mime?: string;
          extmetadata?: {
            LicenseShortName?: { value?: string };
            Artist?: { value?: string };
          };
        }[];
      }
    >;
  };
};

const IMAGE_HOSTS = ['upload.wikimedia.org', 'thumb.wikimedia.org'];
const IMAGE_SEARCH_RESULTS = 48;
// Wikimedia only serves set sizes; this one keeps the results grid light.
const IMAGE_PREVIEW_WIDTH = 330;
const IMAGE_SEARCH_WIDTH = 640;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;
// Wikimedia asks every client to identify itself.
const COMMONS_USER_AGENT = 'SmartPOS/1.0 (product image search)';

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

  // Free pictures for a search term, from Wikimedia Commons (no key needed).
  async searchImages(query: string): Promise<ImageResult[]> {
    const url = new URL('https://commons.wikimedia.org/w/api.php');

    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(IMAGE_SEARCH_RESULTS),
      prop: 'imageinfo',
      iiprop: 'url|mime|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|Artist',
      iiurlwidth: String(IMAGE_SEARCH_WIDTH),
    }).toString();

    let data: CommonsResponse;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': COMMONS_USER_AGENT },
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      data = (await response.json()) as CommonsResponse;
    } catch (error) {
      this.logger.warn(`Image search failed: ${errorMessage(error)}`);
      throw new BadGatewayException('Image search failed, please try again');
    }

    return Object.values(data.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .flatMap((page) => {
        const info = page.imageinfo?.[0];

        if (!info?.thumburl || !/^image\/(jpeg|png)$/.test(info.mime ?? ''))
          return [];

        return [
          {
            url: info.thumburl,
            thumbnail: info.thumburl.replace(
              /\/\d+px-/,
              `/${IMAGE_PREVIEW_WIDTH}px-`,
            ),
            title: page.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
            license: info.extmetadata?.LicenseShortName?.value ?? null,
            author:
              info.extmetadata?.Artist?.value
                ?.replace(/<[^>]*>/g, '')
                .trim()
                .slice(0, 120) || null,
          },
        ];
      });
  }

  // Keeps our own copy of a picture found by search or pasted as a link. This server
  // only ever fetches Wikimedia's image hosts (they ask us to identify ourselves).
  // Any other link goes to Cloudinary to fetch, so a pasted address can never reach
  // anything inside our own network.
  private async uploadFromUrl(link: string): Promise<UploadApiResponse> {
    let url: URL;

    try {
      url = new URL(link);
    } catch {
      throw new BadRequestException('That picture link is not valid');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:')
      throw new BadRequestException('That picture link is not valid');

    if (!IMAGE_HOSTS.includes(url.hostname)) {
      try {
        return await v2.uploader.upload(url.href, {
          folder: 'pos',
          public_id: randomUUID(),
          resource_type: 'image',
          overwrite: false,
          transformation: [
            { width: MAX_STORED_SIZE, height: MAX_STORED_SIZE, crop: 'limit' },
          ],
        });
      } catch (error) {
        this.logger.warn(`Picture link failed: ${errorMessage(error)}`);
        throw new BadRequestException(
          'That link is not a picture we can use. Open the image itself and copy its address',
        );
      }
    }

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': COMMONS_USER_AGENT },
        redirect: 'error',
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      });
      const type = response.headers.get('content-type') ?? '';

      if (!response.ok || !type.startsWith('image/'))
        throw new Error(`HTTP ${response.status} ${type}`);

      const bytes = Buffer.from(await response.arrayBuffer());

      if (bytes.length > MAX_REMOTE_IMAGE_BYTES) throw new Error('Too large');

      return await v2.uploader.upload(
        `data:${type};base64,${bytes.toString('base64')}`,
        {
          folder: 'pos',
          public_id: randomUUID(),
          resource_type: 'image',
          overwrite: false,
          transformation: [
            { width: MAX_STORED_SIZE, height: MAX_STORED_SIZE, crop: 'limit' },
          ],
        },
      );
    } catch (error) {
      this.logger.error(`Picture download failed: ${errorMessage(error)}`);
      throw new BadGatewayException(
        'Could not get that picture, please choose another',
      );
    }
  }

  private upload(picture: ImageSource) {
    return typeof picture === 'string'
      ? this.uploadFromUrl(picture)
      : this.uploadFile(picture);
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
    picture: ImageSource | undefined,
    create: () => Promise<T>,
  ): Promise<T> {
    const uploaded = picture ? await this.upload(picture) : undefined;

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
  async replaceImage(picture: ImageSource, entity: ImageOwner) {
    const uploaded = await this.upload(picture);
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
      relations: { product: true, category: true, employee: true, user: true },
    });

    if (!file) throw new NotFoundException('File not found');

    // Employees need the permission for the screen the image belongs to, and may
    // only remove their own profile picture.
    if (file.product || file.category)
      requirePermission(user, 'products.manage');
    if (file.employee) requirePermission(user, 'employees.manage');
    if (
      file.user &&
      user.role === UserRole.EMPLOYEE &&
      file.user.id !== user.sub
    )
      throw new NotFoundException('File not found');

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
