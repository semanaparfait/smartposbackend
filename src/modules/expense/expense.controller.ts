import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { UserRole } from '../user/entities/user.entity';
import { ExpenseService } from './expense.service';
import {
  CreateExpenseDto,
  ExpenseIdParam,
  RejectExpenseDto,
  RepaidExpenseDto,
  SubmitExpenseDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

// Anyone who sees the money reports sees the costs; recording them is its own
// permission. Workers allowed to submit expenses send what they paid with a
// proof, and it waits for someone who records expenses to approve it.
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

  // ---------------- Submitted by workers ----------------

  @Post('submit')
  @RequirePermissions('expenses.submit')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiOperation({
    summary: 'Submit an expense paid by a worker, with a receipt photo',
  })
  submit(
    @User() user: Payload,
    @Body() dto: SubmitExpenseDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.service.submit(user, dto, picture);
  }

  @Get('mine')
  @RequirePermissions('expenses.submit')
  @ApiOperation({
    summary: 'Expenses I submitted, and whether they were approved',
  })
  mine(@User() user: Payload) {
    return this.service.mine(user);
  }

  @Delete('mine/:expenseId')
  @RequirePermissions('expenses.submit')
  @ApiOperation({ summary: 'Take back a submission not checked yet' })
  withdraw(@User() user: Payload, @Param() { expenseId }: ExpenseIdParam) {
    return this.service.withdraw(user, expenseId);
  }

  @Patch(':expenseId/approve')
  @RequirePermissions('expenses.manage')
  @ApiOperation({ summary: 'Approve a submitted expense' })
  approve(@User() user: Payload, @Param() { expenseId }: ExpenseIdParam) {
    return this.service.approve(user, expenseId);
  }

  @Patch(':expenseId/reject')
  @RequirePermissions('expenses.manage')
  @ApiOperation({ summary: 'Reject a submitted expense, saying why' })
  reject(
    @User() user: Payload,
    @Param() { expenseId }: ExpenseIdParam,
    @Body() dto: RejectExpenseDto,
  ) {
    return this.service.reject(user, expenseId, dto.note);
  }

  @Patch(':expenseId/repaid')
  @RequirePermissions('expenses.manage')
  @ApiOperation({
    summary: 'The worker who paid with their own money was paid back',
  })
  repaid(
    @User() user: Payload,
    @Param() { expenseId }: ExpenseIdParam,
    @Body() dto: RepaidExpenseDto,
  ) {
    return this.service.repaid(user, expenseId, dto.method);
  }

  @Patch(':expenseId/not-repaid')
  @RequirePermissions('expenses.manage')
  @ApiOperation({ summary: 'Undo a paid back marked by mistake' })
  notRepaid(@User() user: Payload, @Param() { expenseId }: ExpenseIdParam) {
    return this.service.notRepaid(user, expenseId);
  }

  // ---------------- Recorded by managers ----------------

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
