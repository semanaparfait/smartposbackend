import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SystemController } from './system.controller';
import { AppService } from './app.service';
import { EmployeeModule } from './modules/employee/employee.module';
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DeviceModule } from './modules/device/device.module';
import { ProductModule } from './modules/product/product.module';
import { ItemModule } from './modules/item/item.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { SeatModule } from './modules/seat/seat.module';
import { RoomModule } from './modules/room/room.module';
import { FloorMapModule } from './modules/floor-map/floor-map.module';
import serverConfig from './config/server.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { HttpThrottlerGuard, LIMITS } from './common/security/security';
import { RequestContextInterceptor } from './common/context/request-context.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AllExceptionFilter } from './common/filter/all.exceptions.filter';
import { LoggerService } from './common/logger/logger.service';
import { SeederModule } from './database/seeder/seeder.module';
import { FileModule } from './modules/file/file.module';
import cloudinaryConfig from './config/cloudinary.config';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ServiceModule } from './modules/service/service.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { MoneyCheckModule } from './modules/money-check/money-check.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { MailModule } from './common/mail/mail.service';
import { WhatsAppModule } from './common/whatsapp/whatsapp.service';
import { InboxModule } from './modules/inbox/inbox.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ClosingModule } from './modules/closing/closing.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [serverConfig, cloudinaryConfig],
    }),
    TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
    ThrottlerModule.forRoot({ throttlers: LIMITS }),
    SeederModule,
    RealtimeModule,

    UserModule,
    CompanyModule,
    DeviceModule,
    EmployeeModule,
    FloorMapModule,
    RoomModule,
    SeatModule,
    ProductModule,
    CartModule,
    ItemModule,
    OrderModule,
    ServiceModule,
    ExpenseModule,
    MoneyCheckModule,
    PayrollModule,
    FileModule,
    AuditModule,
    MailModule,
    WhatsAppModule,
    InboxModule,
    NotificationsModule,
    ClosingModule,
  ],
  // controllers: [AppController],
  controllers: [SystemController],
  providers: [
    LoggerService,
    { provide: APP_FILTER, useClass: AllExceptionFilter },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    AppService,
  ],
})
export class AppModule {}
