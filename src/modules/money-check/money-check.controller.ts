import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
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
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { MoneyCheckService } from './money-check.service';
import { MoneyCheckParams, SaveMoneyCheckDto } from './dto/money-check.dto';

// Anyone who sees the money reports sees the checks; making them needs
// finance.verify.
@ApiTags('Money checks')
@Controller('money-checks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class MoneyCheckController {
  constructor(private readonly service: MoneyCheckService) {}

  @Get()
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: "Checks of workers' daily takings" })
  @ApiQuery({ name: 'from', required: false, example: '2026-11-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-11-30' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  list(
    @User() user: Payload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.list(user, from, to, companyId);
  }

  @Put()
  @RequirePermissions('finance.verify')
  @ApiOperation({ summary: "Save the check of one worker's day (replaces it)" })
  save(@User() user: Payload, @Body() dto: SaveMoneyCheckDto) {
    return this.service.save(user, dto);
  }

  @Delete(':date/:userId')
  @RequirePermissions('finance.verify')
  @ApiOperation({ summary: 'Reopen a day for counting' })
  remove(@User() user: Payload, @Param() { date, userId }: MoneyCheckParams) {
    return this.service.remove(user, date, userId);
  }
}
