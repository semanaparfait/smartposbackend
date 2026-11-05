import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './push-token.entity';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';

// Phone notifications, available to every module (devices, money checks, ...).
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [NotificationsController],
  providers: [PushService],
  exports: [PushService],
})
export class NotificationsModule {}
