import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/request/create-employee.dto';
import { UpdateEmployeeDto } from './dto/request/update-employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeRole } from './entities/employee-role.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UpdateEmployeeRoleDto } from './dto/request/update-employee-role.dto';
import { CreateEmployeeRoleDto } from './dto/request/create-employee-role.dto';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/entities/user.entity';
import { CompanyService } from '../company/company.service';
import { FileService } from '../file/file.service';
import { FileType } from '../file/entities/file.entity';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    @InjectRepository(EmployeeRole)
    private readonly roleRepo: Repository<EmployeeRole>,

    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly companyService: CompanyService,

    private readonly fileService: FileService,
  ) {}

  async createRole(user: Payload, dto: CreateEmployeeRoleDto) {
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      company: { id: targetCompanyId(user, dto.companyId) },
    });

    return this.roleRepo.save(role);
  }

  async getRoles(user: Payload, companyId?: string) {
    return this.roleRepo.find({
      where: companyWhere(user, companyId),
      relations: { company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getRole(user: Payload, id: string) {
    const role = await this.roleRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { company: true, employees: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async updateRole(user: Payload, id: string, dto: UpdateEmployeeRoleDto) {
    const role = await this.getRole(user, id);

    Object.assign(role, dto);

    return this.roleRepo.save(role);
  }

  async deleteRole(user: Payload, id: string) {
    const role = await this.getRole(user, id);

    return this.roleRepo.remove(role);
  }

  async createEmployee(
    user: Payload,
    dto: CreateEmployeeDto,
    picture: Express.Multer.File,
  ) {
    const company = await this.companyService.getOne({
      id: targetCompanyId(user, dto.companyId),
    });

    // Email and phone only need to be unique within the company.
    const emailExist = await this.findOne({
      email: dto.email,
      company: { id: company.id },
    });

    if (emailExist) throw new ConflictException('Email Already exists');

    const phoneExist = await this.findOne({
      phone: dto.phone,
      company: { id: company.id },
    });

    if (phoneExist) throw new ConflictException('Phone Already exists');

    const role = await this.getCompanyRole(dto.roleId, company.id);

    return await this.employeeRepo.manager.transaction(async () => {
      const employee = this.employeeRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        salary: dto.salary,
        shift: dto.shift,
        role: { id: role.id },
        company: { id: company.id },
      });

      await this.employeeRepo.save(employee);

      await this.fileService.save(picture, FileType.IMAGE, employee);

      return await this.userService.create({
        companyCode: company.code,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: UserRole.EMPLOYEE,
      });
    });
  }

  async getEmployees(user: Payload, companyId?: string) {
    return this.employeeRepo.find({
      where: companyWhere(user, companyId),
      relations: { role: true, company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getEmployee(user: Payload, where: FindOptionsWhere<Employee>) {
    const employee = await this.findOne({ ...where, ...companyWhere(user) });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async findOne(where: FindOptionsWhere<Employee>) {
    return await this.employeeRepo.findOne({
      where,
      relations: { role: true, company: true },
    });
  }

  async updateEmployee(user: Payload, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.getEmployee(user, { id });

    if (dto.roleId) {
      employee.role = await this.getCompanyRole(
        dto.roleId,
        employee.company.id,
      );
    }

    Object.assign(employee, {
      name: dto.name ?? employee.name,
      email: dto.email ?? employee.email,
      phone: dto.phone ?? employee.phone,
      salary: dto.salary ?? employee.salary,
      shift: dto.shift ?? employee.shift,
    });

    return this.employeeRepo.save(employee);
  }

  async deleteEmployee(user: Payload, id: string) {
    const employee = await this.getEmployee(user, { id });

    return this.employeeRepo.remove(employee);
  }

  // helpers

  // An employee can only be given a role of their own company.
  private async getCompanyRole(id: string, companyId: string) {
    const role = await this.roleRepo.findOne({
      where: { id, company: { id: companyId } },
    });

    if (!role) throw new NotFoundException('Role not found');

    return role;
  }
}
