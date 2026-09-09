import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
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

@ApiTags('Users')
@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create User' })
  async createUser(@User() user: Payload, @Body() dto: CreateUserDto) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':userId')
  findOne(@Param() { userId }: UserIdParam) {
    return this.service.getOne({ id: userId });
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(+id, updateUserDto);
  // }

  @Delete(':userId')
  remove(@Param() { userId }: UserIdParam) {
    return this.service.remove(userId);
  }
}
