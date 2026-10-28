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
import { withRequirements } from 'src/common/permissions/permissions';
import { Payload } from 'src/util/token.service';
import { RealtimeService } from '../realtime/realtime.service';
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

    private readonly realtime: RealtimeService,
  ) {}

  async createRole(user: Payload, dto: CreateEmployeeRoleDto) {
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions ? withRequirements(dto.permissions) : null,
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
    const { permissions, ...fields } = dto;

    Object.assign(role, fields);
    if (permissions) role.permissions = withRequirements(permissions);

    // Saved without the loaded employees so TypeORM leaves them alone.
    const { employees: _employees, ...changes } = role;
    await this.roleRepo.save(changes);

    if (permissions)
      await this.realtime.usersChanged(await this.realtime.usersWithRole(id));

    return this.getRole(user, id);
  }

  async deleteRole(user: Payload, id: string) {
    const role = await this.getRole(user, id);
    const affected = await this.realtime.usersWithRole(id);

    const removed = await this.roleRepo.remove(role);
    await this.realtime.usersChanged(affected);

    return removed;
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

    const employee = await this.fileService.createWithImage(picture, () =>
      this.employeeRepo.save(
        this.employeeRepo.create({
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          salary: dto.salary,
          shift: dto.shift,
          role: { id: role.id },
          company: { id: company.id },
        }),
      ),
    );

    try {
      return await this.userService.create({
        companyCode: company.code,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: UserRole.EMPLOYEE,
      });
    } catch (error) {
      // Without a login the employee is unusable, so undo it (and its picture).
      await this.removeWithImages(employee);
      throw error;
    }
  }

  async getEmployees(user: Payload, companyId?: string) {
    return this.employeeRepo.find({
      where: companyWhere(user, companyId),
      relations: { role: true, company: true, profile: true, user: true },
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
      relations: { role: true, company: true, profile: true, user: true },
    });
  }

  async updateEmployee(
    user: Payload,
    id: string,
    dto: UpdateEmployeeDto,
    picture?: Express.Multer.File,
  ) {
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

    await this.employeeRepo.save(employee);

    if (picture) await this.fileService.replaceImage(picture, employee);

    if (dto.roleId && employee.user)
      await this.realtime.userChanged(employee.user.id);

    return this.getEmployee(user, { id });
  }

  async deleteEmployee(user: Payload, id: string) {
    const employee = await this.getEmployee(user, { id });

    return this.removeWithImages(employee);
  }

  async resetPin(user: Payload, id: string) {
    const employee = await this.getEmployee(user, { id });
    return this.userService.resetPin(employee.id);
  }

  async setActive(user: Payload, id: string, active: boolean) {
    await this.getEmployee(user, { id });
    await this.userService.setEmployeeActive(id, active);
    return this.getEmployee(user, { id });
  }

  // Called when an employee edits their own profile.
  async syncProfile(id: string, changes: { name: string; phone: string }) {
    const employee = await this.findOne({ id });

    if (!employee) throw new NotFoundException('Employee not found');

    if (changes.phone !== employee.phone) {
      const phoneExist = await this.findOne({
        phone: changes.phone,
        company: { id: employee.company.id },
      });

      if (phoneExist) throw new ConflictException('Phone already in use');
    }

    Object.assign(employee, changes);

    return this.employeeRepo.save(employee);
  }

  // helpers

  private async removeWithImages(employee: Employee) {
    const images = await this.fileService.findImages(employee);
    await this.userService.detachEmployee(employee.id);
    const removed = await this.employeeRepo.remove(employee);
    await this.fileService.deleteFromStorage(images);
    return removed;
  }

  // An employee can only be given a role of their own company.
  private async getCompanyRole(id: string, companyId: string) {
    const role = await this.roleRepo.findOne({
      where: { id, company: { id: companyId } },
    });

    if (!role) throw new NotFoundException('Role not found');

    return role;
  }
}
