import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/request/create-employee.dto';
import { UpdateEmployeeDto } from './dto/request/update-employee.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateEmployeeRoleDto } from './dto/request/create-employee-role.dto';
import { UpdateEmployeeRoleDto } from './dto/request/update-employee-role.dto';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { EmployeeIdParam } from './dto/request/employee-param.dto';
import { EmployeeRoleIdParam } from './dto/request/employee-role-param.dto';

@ApiTags('Employees')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post('roles')
  @ApiOperation({ summary: 'Create role' })
  createRole(@User() user: Payload, @Body() dto: CreateEmployeeRoleDto) {
    return this.service.createRole(user.sub, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  getRoles(@User() user: Payload) {
    return this.service.getRoles(user.sub);
  }

  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Get role by id' })
  getRole(@User() user: Payload, @Param() { roleId }: EmployeeRoleIdParam) {
    return this.service.getRole(user.sub, roleId);
  }

  @Patch('roles/:roleId')
  @ApiOperation({ summary: 'Update role' })
  updateRole(
    @User() user: Payload,
    @Param() { roleId }: EmployeeRoleIdParam,
    @Body() dto: UpdateEmployeeRoleDto,
  ) {
    return this.service.updateRole(user.sub, roleId, dto);
  }

  @Delete('roles/:roleId/delete')
  @ApiOperation({ summary: 'Delete role' })
  deleteRole(@User() user: Payload, @Param() { roleId }: EmployeeRoleIdParam) {
    return this.service.deleteRole(user.sub, roleId);
  }

  // ---------- Employee ---------------------

  @Post('employees')
  @ApiOperation({ summary: 'Create employee' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  createEmployee(
    @User() user: Payload,
    @Body() dto: CreateEmployeeDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createEmployee(user.sub, dto, picture);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  getEmployees(@User() user: Payload) {
    return this.service.getEmployees(user.sub);
  }

  @Get('employees/:employeeId')
  @ApiOperation({ summary: 'Get employee by id' })
  getEmployee(@User() user: Payload, @Param() { employeeId }: EmployeeIdParam) {
    return this.service.getEmployee(user.sub, { id: employeeId });
  }

  @Patch('employees/:employeeId')
  @ApiOperation({ summary: 'Update employee' })
  updateEmployee(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.updateEmployee(user.sub, employeeId, dto);
  }

  @Delete('employees/:employeeId/delete')
  @ApiOperation({ summary: 'Delete employee' })
  deleteEmployee(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
  ) {
    return this.service.deleteEmployee(user.sub, employeeId);
  }
}
