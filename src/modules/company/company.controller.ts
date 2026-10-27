import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CompanyIdParam } from './dto/request/company-param.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';

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
  @ApiOperation({ summary: 'Update company' })
  update(
    @Param() { companyId }: CompanyIdParam,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(companyId, dto);
  }

  @Delete(':companyId/delete')
  @ApiOperation({ summary: 'Delete company' })
  remove(@Param() { companyId }: CompanyIdParam) {
    return this.service.remove(companyId);
  }
}
