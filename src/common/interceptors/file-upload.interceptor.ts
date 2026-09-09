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
      if (!file.mimetype.startsWith('image/')) {
        return cb(
          new BadRequestException('Only image files are allowed!'),
          false,
        );
      }
      cb(null, true);
    };

    const upload = multer({ storage, fileFilter })[
      this.maxCount > 1 ? 'array' : 'single'
    ](this.fieldName, this.maxCount);

    return new Promise((resolve, reject) => {
      upload(req, res, async (err: any) => {
        if (err) {
          return reject(
            new BadRequestException(`File upload failed: ${err.message}`),
          );
        }

        // ✅ CRITICAL: Check if files were actually uploaded
        const uploadedFiles = this.maxCount > 1 ? req.files : req.file;

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
