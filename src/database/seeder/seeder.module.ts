import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { User } from 'src/modules/user/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeeder } from './user.seeder';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserSeeder, SeederService, LoggerService],
  exports: [SeederService],
})
export class SeederModule {}
