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
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { ExpenseService } from './expense.service';
import {
  CreateExpenseDto,
  ExpenseIdParam,
  UpdateExpenseDto,
} from './dto/expense.dto';

// Anyone who sees the money reports sees the costs; recording them is its own
// permission.
@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class ExpenseController {
  constructor(private readonly service: ExpenseService) {}

  @Get()
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'All expenses, one-time and repeating' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getAll(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.list(user, companyId);
  }

  @Get('salaries')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: "Workers' monthly salaries, counted as a cost" })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  salaries(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.salaries(user, companyId);
  }

  @Post()
  @RequirePermissions('expenses.manage')
  @ApiOperation({ summary: 'Record an expense' })
  create(@User() user: Payload, @Body() dto: CreateExpenseDto) {
    return this.service.create(user, dto);
  }

  @Patch(':expenseId')
  @RequirePermissions('expenses.manage')
  @ApiOperation({
    summary: 'Change an expense, or stop a repeating one (endDate)',
  })
  update(
    @User() user: Payload,
    @Param() { expenseId }: ExpenseIdParam,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(user, expenseId, dto);
  }

  @Delete(':expenseId')
  @RequirePermissions('expenses.manage')
  @ApiOperation({ summary: 'Delete an expense recorded by mistake' })
  remove(@User() user: Payload, @Param() { expenseId }: ExpenseIdParam) {
    return this.service.remove(user, expenseId);
  }
}
