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
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { StationService } from './station.service';
import {
  CreateStationDto,
  StationIdParam,
  UpdateStationDto,
} from './dto/station.dto';

// Kitchen stations (kitchen, bar, grill). Every worker reads them: tills show
// each station's progress and kitchen screens show their own station's items.
@ApiTags('Stations')
@Controller('stations')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class StationController {
  constructor(private readonly service: StationService) {}

  @Get()
  @AnyEmployee()
  @ApiOperation({ summary: 'All kitchen stations, in screen order' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  list(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.list(user, companyId);
  }

  @Post()
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Add a station' })
  create(@User() user: Payload, @Body() dto: CreateStationDto) {
    return this.service.create(user, dto);
  }

  @Patch(':stationId')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Rename or reorder a station' })
  update(
    @User() user: Payload,
    @Param() { stationId }: StationIdParam,
    @Body() dto: UpdateStationDto,
  ) {
    return this.service.update(user, stationId, dto);
  }

  @Delete(':stationId')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Delete a station with no open orders' })
  remove(@User() user: Payload, @Param() { stationId }: StationIdParam) {
    return this.service.remove(user, stationId);
  }
}
