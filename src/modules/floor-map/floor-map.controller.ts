import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { FloorMapService } from './floor-map.service';
import { CreateFloorMapDto } from './dto/request/create-floor-map.dto';
import { UpdateFloorMapDto } from './dto/request/update-floor-map.dto';
import { FloorMapIdParam } from './dto/request/floor-map-param.dto';

@ApiTags('Floor Maps')
@Controller('floor-maps')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class FloorMapController {
  constructor(private readonly service: FloorMapService) {}

  @Post()
  @ApiOperation({ summary: 'Create floor map' })
  create(@User() user: Payload, @Body() dto: CreateFloorMapDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all floor maps' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  findAll(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.findAll(user, companyId);
  }

  @Get(':floorMapId')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get floor map by id' })
  findOne(@User() user: Payload, @Param() { floorMapId }: FloorMapIdParam) {
    return this.service.findOne(user, floorMapId);
  }

  @Patch(':floorMapId')
  @ApiOperation({ summary: 'Update floor map' })
  update(
    @User() user: Payload,
    @Param() { floorMapId }: FloorMapIdParam,
    @Body() dto: UpdateFloorMapDto,
  ) {
    return this.service.update(user, floorMapId, dto);
  }

  @Delete(':floorMapId/delete')
  @ApiOperation({ summary: 'Delete floor map' })
  remove(@User() user: Payload, @Param() { floorMapId }: FloorMapIdParam) {
    return this.service.remove(user, floorMapId);
  }
}
