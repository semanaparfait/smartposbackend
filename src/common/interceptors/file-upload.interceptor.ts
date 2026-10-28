import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import multer, { diskStorage } from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { AsyncResource } from 'async_hooks';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
];

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  constructor(
    private readonly fieldName: string,
    private readonly maxCount: number,
    private readonly required: boolean = true, // Add required parameter
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const storage = diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${randomUUID()}${ext}`);
      },
    });

    const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(
          new BadRequestException(
            'Only JPEG, PNG, WebP, GIF, AVIF or HEIC images are allowed',
          ),
          false,
        );
      }
      cb(null, true);
    };

    const upload = multer({
      storage,
      fileFilter,
      limits: { fileSize: MAX_IMAGE_BYTES, files: this.maxCount },
    })[this.maxCount > 1 ? 'array' : 'single'](this.fieldName, this.maxCount);

    return new Promise((resolve, reject) => {
      // Multer calls back from the request stream's events, which run outside this
      // request's async context. Bound, so the handler started below still sees the
      // RequestContext (who is acting, for the audit log).
      const done = AsyncResource.bind(async (err: any) => {
        const uploadedFiles = this.maxCount > 1 ? req.files : req.file;

        if (err) {
          await this.cleanupTempFiles(uploadedFiles);

          if (err.code === 'LIMIT_FILE_SIZE')
            return reject(
              new BadRequestException(
                `Image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`,
              ),
            );

          return reject(
            err instanceof BadRequestException
              ? err
              : new BadRequestException(`File upload failed: ${err.message}`),
          );
        }

        // Temp files are normally removed once uploaded to Cloudinary; this also
        // covers requests that fail before getting that far (e.g. validation).
        res.once('close', () => void this.cleanupTempFiles(uploadedFiles));

        // ✅ CRITICAL: Check if files were actually uploaded

        if (
          this.required &&
          (!uploadedFiles ||
            (Array.isArray(uploadedFiles) && uploadedFiles.length === 0))
        ) {
          // Clean up any partially uploaded files
          await this.cleanupTempFiles(uploadedFiles);

          return reject(
            new BadRequestException(
              `At least one file is required for field: ${this.fieldName}`,
            ),
          );
        }

        // Attach files to request for later use
        if (this.maxCount > 1) {
          req.uploadedFiles = req.files;
        } else {
          req.uploadedFile = req.file;
        }

        resolve(next.handle());
      });

      upload(req, res, done);
    });
  }

  private async cleanupTempFiles(files: any): Promise<void> {
    const fs = require('fs').promises;

    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    for (const file of fileArray) {
      if (file?.path) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }
}
