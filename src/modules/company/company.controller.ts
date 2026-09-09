import {
  Body,
  Controller,
  Delete,
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

@ApiTags('Companies')
@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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
  @ApiOperation({ summary: 'Get company by id' })
  findOne(@Param() { companyId }: CompanyIdParam) {
    return this.service.getOne({ id: companyId });
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
