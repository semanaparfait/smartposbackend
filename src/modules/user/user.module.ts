import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TokenService } from 'src/util/token.service';
import { JwtModule } from '@nestjs/jwt';
import { CompanyModule } from '../company/company.module';
import { DeviceModule } from '../device/device.module';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ global: true }),
    CompanyModule,
    DeviceModule,
    forwardRef(() => EmployeeModule),
  ],
  controllers: [AuthController, UserController],
  providers: [UserService, AuthService, TokenService],
  exports: [UserService],
})
export class UserModule {}
