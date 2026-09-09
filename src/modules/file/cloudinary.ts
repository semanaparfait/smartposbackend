import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigOptions, v2 } from 'cloudinary';

@Injectable()
export class Cloudinary {
  constructor(private readonly configService: ConfigService) {
    v2.config(configService.get<ConfigOptions>('cloudinary'));
  }
}
