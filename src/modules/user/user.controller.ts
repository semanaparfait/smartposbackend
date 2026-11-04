import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserIdParam } from './dto/request/user-param.dto';
import { AdminUpdateUserDto } from './dto/request/admin-update-user.dto';

@ApiTags('Users')
@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create User' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':userId')
  findOne(@Param() { userId }: UserIdParam) {
    return this.service.getOne({ id: userId });
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Edit an account: name, email, phone, on or off' })
  update(@Param() { userId }: UserIdParam, @Body() dto: AdminUpdateUserDto) {
    return this.service.adminUpdate(userId, dto);
  }

  @Patch(':userId/reset-password')
  @ApiOperation({ summary: 'Give the account a new password, shown once' })
  resetPassword(@Param() { userId }: UserIdParam) {
    return this.service.adminResetPassword(userId);
  }

  @Delete(':userId')
  remove(@Param() { userId }: UserIdParam) {
    return this.service.remove(userId);
  }
}
