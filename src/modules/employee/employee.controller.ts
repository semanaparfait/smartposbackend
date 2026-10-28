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
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/request/create-employee.dto';
import { UpdateEmployeeDto } from './dto/request/update-employee.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
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
import { UpdateEmployeeStatusDto } from './dto/request/update-employee-status.dto';
import { UpdateMultipleDevicesDto } from './dto/request/update-multiple-devices.dto';
import { UpdateEmployeePermissionsDto } from './dto/request/update-employee-permissions.dto';
import { EmployeeRoleIdParam } from './dto/request/employee-role-param.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Employees')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post('roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Create role' })
  createRole(@User() user: Payload, @Body() dto: CreateEmployeeRoleDto) {
    return this.service.createRole(user, dto);
  }

  @Get('roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getRoles(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getRoles(user, companyId);
  }

  @Get('roles/:roleId')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get role by id' })
  getRole(@User() user: Payload, @Param() { roleId }: EmployeeRoleIdParam) {
    return this.service.getRole(user, roleId);
  }

  @Patch('roles/:roleId')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Update role' })
  updateRole(
    @User() user: Payload,
    @Param() { roleId }: EmployeeRoleIdParam,
    @Body() dto: UpdateEmployeeRoleDto,
  ) {
    return this.service.updateRole(user, roleId, dto);
  }

  @Delete('roles/:roleId/delete')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Delete role' })
  deleteRole(@User() user: Payload, @Param() { roleId }: EmployeeRoleIdParam) {
    return this.service.deleteRole(user, roleId);
  }

  // ---------- Employee ---------------------

  @Post('employees')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Create employee' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1))
  @ApiConsumes('multipart/form-data')
  createEmployee(
    @User() user: Payload,
    @Body() dto: CreateEmployeeDto,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    return this.service.createEmployee(user, dto, picture);
  }

  @Get('employees')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Get all employees' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getEmployees(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getEmployees(user, companyId);
  }

  @Get('employees/:employeeId')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Get employee by id' })
  getEmployee(@User() user: Payload, @Param() { employeeId }: EmployeeIdParam) {
    return this.service.getEmployee(user, { id: employeeId });
  }

  @Patch('employees/:employeeId')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Update employee (send picture to replace it)' })
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiConsumes('multipart/form-data', 'application/json')
  updateEmployee(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
    @Body() dto: UpdateEmployeeDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.service.updateEmployee(user, employeeId, dto, picture);
  }

  @Patch('employees/:employeeId/reset-pin')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Give the employee a new PIN (shown once)' })
  resetPin(@User() user: Payload, @Param() { employeeId }: EmployeeIdParam) {
    return this.service.resetPin(user, employeeId);
  }

  @Patch('employees/:employeeId/status')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Activate or deactivate an employee (instant)' })
  setStatus(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.service.setActive(user, employeeId, dto.active);
  }

  @Patch('employees/:employeeId/multiple-devices')
  @RequirePermissions('employees.manage')
  @ApiOperation({
    summary: 'Allow or stop the employee being signed in on several devices',
  })
  setMultipleDevices(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
    @Body() dto: UpdateMultipleDevicesDto,
  ) {
    return this.service.setMultipleDevices(user, employeeId, dto.allow);
  }

  @Patch('employees/:employeeId/permissions')
  @RequirePermissions('employees.manage', 'roles.manage')
  @ApiOperation({
    summary: "Adjust one employee's access on top of their role (instant)",
  })
  setPermissions(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
    @Body() dto: UpdateEmployeePermissionsDto,
  ) {
    return this.service.setPermissions(user, employeeId, dto);
  }

  @Delete('employees/:employeeId/delete')
  @RequirePermissions('employees.manage')
  @ApiOperation({ summary: 'Delete employee' })
  deleteEmployee(
    @User() user: Payload,
    @Param() { employeeId }: EmployeeIdParam,
  ) {
    return this.service.deleteEmployee(user, employeeId);
  }
}
