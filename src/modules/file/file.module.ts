import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { Cloudinary } from './cloudinary';
import { FileController } from './file.controller';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FileController],
  providers: [FileService, Cloudinary],
  exports: [FileService],
})
export class FileModule {}
