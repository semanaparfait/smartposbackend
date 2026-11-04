import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CompanyIdParam } from './dto/request/company-param.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { KitchenSettingsDto } from './dto/request/kitchen-settings.dto';
import { CompanyFeaturesDto } from './dto/request/company-features.dto';
import { CompanyStatusDto } from './dto/request/company-status.dto';
import { RecordPaymentDto, SetPlanDto } from './dto/request/billing.dto';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create company' })
  create(@Body() dto: CreateCompanyDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll() {
    return this.service.findAll();
  }

  @Get('platform-overview')
  @ApiOperation({
    summary: 'Totals across every company: sales, users, devices, last 30 days',
  })
  platformOverview() {
    return this.service.platformOverview();
  }

  @Get(':companyId/billing')
  @ApiOperation({ summary: 'Subscription: plan, paid until, payments' })
  billing(@Param() { companyId }: CompanyIdParam) {
    return this.service.billing(companyId);
  }

  @Patch(':companyId/billing/plan')
  @ApiOperation({ summary: 'Choose the plan and its monthly price' })
  setPlan(@Param() { companyId }: CompanyIdParam, @Body() dto: SetPlanDto) {
    return this.service.setPlan(companyId, dto);
  }

  @Post(':companyId/billing/payments')
  @ApiOperation({ summary: 'Record a subscription payment' })
  addPayment(
    @User() user: Payload,
    @Param() { companyId }: CompanyIdParam,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.addPayment(user, companyId, dto);
  }

  @Delete(':companyId/billing/payments/:paymentId')
  @ApiOperation({ summary: 'Remove a payment recorded by mistake' })
  removePayment(
    @Param() { companyId }: CompanyIdParam,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.service.removePayment(companyId, paymentId);
  }

  // Super admin only (the controller's default role).
  @Patch(':companyId/features')
  @ApiOperation({
    summary: 'Turn extras (services, delivery, floor map, kitchen) on or off',
  })
  setFeatures(
    @Param() { companyId }: CompanyIdParam,
    @Body() dto: CompanyFeaturesDto,
  ) {
    return this.service.setFeatures(companyId, dto);
  }

  // Super admin only (the controller's default role).
  @Patch(':companyId/status')
  @ApiOperation({
    summary:
      'Terminate a company (nobody in it can sign in or use SmartPOS) or activate it again',
  })
  setStatus(
    @Param() { companyId }: CompanyIdParam,
    @Body() dto: CompanyStatusDto,
  ) {
    return this.service.setStatus(companyId, dto.active, dto.reason);
  }

  @Put('kitchen-settings')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @RequirePermissions('settings.manage')
  @ApiOperation({
    summary:
      'Turn the kitchen screen on or off; on also makes a Kitchen staff role',
  })
  saveKitchen(@User() user: Payload, @Body() dto: KitchenSettingsDto) {
    if (!user.companyId)
      throw new ForbiddenException('Only a company can turn on its kitchen');
    return this.service.saveKitchen(user.companyId, dto.enabled);
  }

  @Get(':companyId')
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.EMPLOYEE)
  @RequirePermissions('settings.manage')
  @ApiOperation({
    summary:
      'Get company with its users, devices (online status, current user, activity), employees and roles',
  })
  findOne(@User() user: Payload, @Param() { companyId }: CompanyIdParam) {
    if (user.role !== UserRole.SUPERADMIN && user.companyId !== companyId)
      throw new ForbiddenException('You can only view your own company');

    return this.service.getDetails(companyId);
  }

  @Patch(':companyId')
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER, UserRole.EMPLOYEE)
  @RequirePermissions('settings.manage')
  @ApiOperation({
    summary: 'Update company profile (owners: their own company only)',
  })
  @UseInterceptors(new FileUploadInterceptor('logo', 1, false))
  @ApiConsumes('multipart/form-data', 'application/json')
  update(
    @User() user: Payload,
    @Param() { companyId }: CompanyIdParam,
    @Body() dto: UpdateCompanyDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    if (user.role !== UserRole.SUPERADMIN && user.companyId !== companyId)
      throw new ForbiddenException('You can only edit your own company');

    return this.service.update(companyId, dto, logo);
  }

  @Delete(':companyId/delete')
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param() { companyId }: CompanyIdParam) {
    return this.service.remove(companyId);
  }
}
