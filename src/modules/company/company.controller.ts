import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
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

  @Get(':companyId')
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER)
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
  @Roles(UserRole.SUPERADMIN, UserRole.OWNER)
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
