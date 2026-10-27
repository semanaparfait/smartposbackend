import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { compareHashContent, hashContent } from 'src/util';
import { randomBytes } from 'crypto';
import { Company } from '../company/entities/company.entity';
import { CompanyService } from '../company/company.service';
import { EmployeeService } from '../employee/employee.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private companyService: CompanyService,

    @Inject(forwardRef(() => EmployeeService))
    private employeeService: EmployeeService,
  ) {}

  async create(dto: CreateUserDto) {
    const pswd = randomBytes(9).toString('base64').slice(0, 10);

    let company: Company | undefined;
    let pin: string | undefined;
    let employee;

    if (dto.role !== UserRole.SUPERADMIN && !dto.companyCode)
      throw new BadRequestException('companyCode is required for this role');

    if (dto.companyCode)
      company = await this.companyService.getOne({ code: dto.companyCode });

    if (dto.role === UserRole.EMPLOYEE && company) {
      pin = await this.generateUniquePin(company.id);

      employee = await this.employeeService.findOne({
        email: dto.email,
        company: { id: company.id },
      });

      if (!employee) throw new NotFoundException('Employee not found');
    }

    const user = this.userRepo.create({
      ...dto,
      password: await hashContent(pswd),
      ...(pin ? { pin: await hashContent(pin) } : {}),
      // pin: await hashContent(pin),
      ...(employee ? { employee: { id: employee.id } } : {}),
      ...(company ? { company: { id: company?.id } } : {}),
    });
    await this.userRepo.save(user);

    // Returned once so the credentials can be handed to the new user.
    user.password = pswd;
    if (pin) user.pin = pin;
    return user;
  }

  async getOne(where: FindOptionsWhere<User>) {
    const user = await this.findOne(where);
    if (!user) throw new NotFoundException('User not Found');
    return user;
  }

  async findAll(where?: FindOptionsWhere<User>) {
    return this.userRepo.find({
      where,
      relations: { employee: true, company: true },
    });
  }

  async findOne(where: FindOptionsWhere<User>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(User) : this.userRepo;
    return await repo.findOne({
      where,
      relations: { employee: true, company: true },
    });
  }

  // Same as findOne/findAll but also loads the password and pin hashes (excluded by default).
  async findWithSecrets(where: FindOptionsWhere<User>) {
    return this.secretsQuery(where).getOne();
  }

  async findAllWithSecrets(where: FindOptionsWhere<User>) {
    return this.secretsQuery(where).getMany();
  }

  async update(user: Partial<User>): Promise<User> {
    const existingUser = await this.userRepo.preload(user);

    if (!existingUser) throw new NotFoundException('User not found');

    return await this.userRepo.save(existingUser);
  }

  async remove(id: string) {
    const user = await this.getOne({ id });
    await this.userRepo.remove(user);
    return user;
  }

  // When an employee is deleted their login is kept (their orders still point to it)
  // but deactivated and unlinked, so they can no longer sign in.
  async detachEmployee(employeeId: string) {
    const user = await this.userRepo.findOne({
      where: { employee: { id: employeeId } },
      relations: { company: true },
    });

    if (!user) return;

    user.active = false;
    user.employee = null;

    await this.userRepo.save(user);
  }

  // Bookkeeping write that shouldn't appear in the audit history.
  async touchLastLogin(id: string, at: Date) {
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({ lastLoginAt: at })
      .where('id = :id', { id })
      .callListeners(false)
      .execute();
  }

  async changePassword(id: string, password: string) {
    const user = await this.getOne({ id });

    user.password = await hashContent(password);
    user.mustChangePassword = false;

    await this.userRepo.save(user);
  }

  // helpers

  private secretsQuery(where: FindOptionsWhere<User>) {
    return this.userRepo
      .createQueryBuilder('user')
      .setFindOptions({ where, relations: { employee: true, company: true } })
      .addSelect(['user.password', 'user.pin']);
  }

  // PIN login identifies the employee by PIN alone, so PINs must be unique within a company.
  private async generateUniquePin(companyId?: string) {
    const existing = companyId
      ? await this.findAllWithSecrets({
          role: UserRole.EMPLOYEE,
          company: { id: companyId },
        })
      : [];

    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      let taken = false;
      for (const user of existing) {
        if (user.pin && (await compareHashContent(pin, user.pin))) {
          taken = true;
          break;
        }
      }

      if (!taken) return pin;
    }

    throw new ConflictException('Could not generate a unique PIN, try again');
  }
}
