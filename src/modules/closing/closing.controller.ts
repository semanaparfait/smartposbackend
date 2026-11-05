import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { ClosingService } from './closing.service';
import { CloseDayDto } from './closing.dto';

// Closing the business day: owners, and workers allowed to check money.
@ApiTags('Day closing')
@Controller('day-closings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@RequirePermissions('finance.verify')
@ApiBearerAuth()
export class ClosingController {
  constructor(private readonly service: ClosingService) {}

  @Get('preview')
  @ApiOperation({
    summary: 'Open orders, expected money and stock, before closing',
  })
  preview(@User() user: Payload) {
    return this.service.preview(user);
  }

  @Post()
  @ApiOperation({
    summary: 'Close the day: save the counts and tell the owners',
  })
  close(@User() user: Payload, @Body() dto: CloseDayDto) {
    return this.service.close(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Past closings, newest first' })
  list(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.list(user, companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One closing' })
  one(@User() user: Payload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.one(user, id);
  }
}
