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

  async createRole(userId: string, dto: CreateEmployeeRoleDto) {
    const company = await this.companyService.getOne({ users: { id: userId } });

    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      company: { id: company.id },
    });

    return this.roleRepo.save(role);
  }

  async getRoles(userId: string) {
    const company = await this.companyService.getOne({ users: { id: userId } });

    return this.roleRepo.find({
      where: { company: { id: company.id } },
      relations: { company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getRole(userId: string, id: string) {
    const company = await this.companyService.getOne({ users: { id: userId } });

    const role = await this.roleRepo.findOne({
      where: { id, company: { id: company.id } },
      relations: { company: true, employees: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async updateRole(userId: string, id: string, dto: UpdateEmployeeRoleDto) {
    const role = await this.getRole(userId, id);

    Object.assign(role, dto);

    return this.roleRepo.save(role);
  }

  async deleteRole(userId: string, id: string) {
    const role = await this.getRole(userId, id);

    return this.roleRepo.remove(role);
  }

  async createEmployee(
    userId: string,
    dto: CreateEmployeeDto,
    picture: Express.Multer.File,
  ) {
    const emailExist = await this.findOne({ email: dto.email });

    if (emailExist) throw new ConflictException('Email Already exists');

    const phoneExist = await this.findOne({ phone: dto.phone });

    if (phoneExist) throw new ConflictException('Phone Already exists');

    const company = await this.companyService.getOne({ users: { id: userId } });

    const role = await this.roleRepo.findOne({ where: { id: dto.roleId } });

    if (!role) throw new NotFoundException('Role not found');

    return await this.employeeRepo.manager.transaction(async (manager) => {
      const employee = this.employeeRepo.create({
        // profile: dto.profile,
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

      const user = await this.userService.create(userId, {
        companyCode: company.code,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: UserRole.EMPLOYEE,
      });

      return user;
    });
  }

  async getEmployees(userId: string) {
    const company = await this.companyService.getOne({ users: { id: userId } });

    return this.employeeRepo.find({
      where: { company: { id: company.id } },
      relations: { role: true, company: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getEmployee(userId: string, where: FindOptionsWhere<Employee>) {
    const company = await this.companyService.getOne({ users: { id: userId } });

    const employee = await this.findOne({
      ...where,
      // id,
      company: { id: company.id },
    });

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

  async updateEmployee(userId: string, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.getEmployee(userId, { id });

    if (dto.roleId) {
      const role = await this.roleRepo.findOne({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      employee.role = role;
    }

    Object.assign(employee, {
      // profile: dto.profile ?? employee.profile,
      name: dto.name ?? employee.name,
      email: dto.email ?? employee.email,
      phone: dto.phone ?? employee.phone,
      salary: dto.salary ?? employee.salary,
      shift: dto.shift ?? employee.shift,
    });

    return this.employeeRepo.save(employee);
  }

  async deleteEmployee(userId: string, id: string) {
    const employee = await this.getEmployee(userId, { id });

    return this.employeeRepo.remove(employee);
  }
}
