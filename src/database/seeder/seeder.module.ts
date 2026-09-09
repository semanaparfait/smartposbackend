import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { User } from 'src/modules/user/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeeder } from './user.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserSeeder, SeederService],
  exports: [SeederService],
})
export class SeederModule {}
