import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { Cloudinary } from './cloudinary';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  providers: [FileService, Cloudinary],
  exports: [FileService],
})
export class FileModule {}
