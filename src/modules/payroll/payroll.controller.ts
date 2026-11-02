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
import { AnyEmployee } from 'src/common/decorators/any-employee.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { PayrollService } from './payroll.service';
import {
  CreateStaffDebtDto,
  DebtIdParam,
  DebtPaymentIdParam,
  RecordDebtPaymentDto,
  RejectDebtPaymentDto,
  SubmitDebtPaymentDto,
} from './dto/payroll.dto';

// Salaries and staff debts. Managing them is "Salaries & staff debts"; every
// worker sees and pays back their own.
@ApiTags('Salaries & staff debts')
@Controller('staff-debts')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  // ---------------- The worker's own ----------------

  @Get('mine')
  @AnyEmployee()
  @ApiOperation({ summary: 'What I owe the company and my payments' })
  mine(@User() user: Payload) {
    return this.service.mine(user);
  }

  @Post('mine/payments')
  @AnyEmployee()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiOperation({ summary: 'Pay back what I owe; waits for approval' })
  submit(
    @User() user: Payload,
    @Body() dto: SubmitDebtPaymentDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.service.submit(user, dto, picture);
  }

  @Delete('mine/payments/:paymentId')
  @AnyEmployee()
  @ApiOperation({ summary: 'Take back a payment not checked yet' })
  withdraw(@User() user: Payload, @Param() { paymentId }: DebtPaymentIdParam) {
    return this.service.withdraw(user, paymentId);
  }

  // ---------------- Managers ----------------

  @Get()
  @RequirePermissions('payroll.manage')
  @ApiOperation({ summary: 'Each worker: salary, what they owe, what to pay' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  overview(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.overview(user, companyId);
  }

  @Post()
  @RequirePermissions('payroll.manage')
  @ApiOperation({ summary: 'Charge something to a worker' })
  charge(@User() user: Payload, @Body() dto: CreateStaffDebtDto) {
    return this.service.charge(user, dto);
  }

  @Delete(':debtId')
  @RequirePermissions('payroll.manage')
  @ApiOperation({ summary: 'Remove a debt charged by mistake' })
  remove(@User() user: Payload, @Param() { debtId }: DebtIdParam) {
    return this.service.removeDebt(user, debtId);
  }

  @Post('payments')
  @RequirePermissions('payroll.manage')
  @ApiOperation({
    summary: 'Record money given back, or take it from the salary',
  })
  record(@User() user: Payload, @Body() dto: RecordDebtPaymentDto) {
    return this.service.record(user, dto);
  }

  @Patch('payments/:paymentId/approve')
  @RequirePermissions('payroll.manage')
  @ApiOperation({ summary: "Approve a worker's payment" })
  approve(@User() user: Payload, @Param() { paymentId }: DebtPaymentIdParam) {
    return this.service.approve(user, paymentId);
  }

  @Patch('payments/:paymentId/reject')
  @RequirePermissions('payroll.manage')
  @ApiOperation({ summary: "Reject a worker's payment, saying why" })
  reject(
    @User() user: Payload,
    @Param() { paymentId }: DebtPaymentIdParam,
    @Body() dto: RejectDebtPaymentDto,
  ) {
    return this.service.reject(user, paymentId, dto.note);
  }
}
