import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Feature } from 'src/common/decorators/feature.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { VenueService } from './venue.service';
import { SaveLayoutDto, UpdateTableDto } from './venue.dto';

// The floor map and its tables. Every worker sees the map and serves tables;
// only the owner (or settings.manage) changes the map.
@ApiTags('Floor map')
@Controller('venue')
@UseGuards(AuthGuard, RolesGuard)
@Feature('floorMap')
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class VenueController {
  constructor(private readonly service: VenueService) {}

  @Get()
  @AnyEmployee()
  @ApiOperation({ summary: "The company's floor map" })
  layout(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.layout(user, companyId);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Save the floor map' })
  save(
    @User() user: Payload,
    @Body() dto: SaveLayoutDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.saveLayout(user, dto, companyId);
  }

  @Get('tables')
  @AnyEmployee()
  @ApiOperation({ summary: 'Tables that are taken, booked or being cleaned' })
  tables(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.listTables(user, companyId);
  }

  @Patch('tables/:tableId')
  @AnyEmployee()
  @ApiOperation({
    summary: 'Seat guests, book, link an order, clean or free a table',
  })
  updateTable(
    @User() user: Payload,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.updateTable(user, tableId.slice(0, 64), dto, companyId);
  }
}
