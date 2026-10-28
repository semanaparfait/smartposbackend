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
import { FileService } from '../file/file.service';
import { UpdateProfileDto } from './dto/request/update-profile.dto';

// Repeated (111111) or sequential (123456, 987654) PINs are the first ones guessed.
function isWeakPin(pin: string) {
  const digits = [...pin].map(Number);
  const steps = new Set(digits.slice(1).map((d, i) => d - digits[i]));
  return steps.size === 1 && [0, 1, -1].includes([...steps][0]);
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private companyService: CompanyService,

    @Inject(forwardRef(() => EmployeeService))
    private employeeService: EmployeeService,

    private fileService: FileService,
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
    const images = await this.fileService.findImages(user);
    await this.userRepo.remove(user);
    await this.fileService.deleteFromStorage(images);
    return user;
  }

  // The logged-in user's own profile, with their picture: an employee's picture is
  // on their employee record, everyone else's is their avatar.
  async getProfile(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: {
        company: true,
        employee: { profile: true, role: true },
        avatar: true,
      },
    });

    if (!user) throw new NotFoundException('User not Found');

    return {
      ...user,
      picture: user.employee?.profile ?? user.avatar ?? null,
      // Same rule as RolesGuard. Left out (= everything allowed) for owners, super
      // admins and roles saved without a list.
      ...(user.role === UserRole.EMPLOYEE
        ? {
            permissions: user.employee?.role
              ? (user.employee.role.permissions ?? undefined)
              : [],
          }
        : {}),
    };
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
    picture?: Express.Multer.File,
  ) {
    const user = await this.findWithSecrets({ id });

    if (!user) throw new NotFoundException('User not Found');

    if (dto.email !== undefined && dto.email !== user.email) {
      // An employee's email links their login to their employee record.
      if (user.employee)
        throw new BadRequestException(
          'Your email is managed by the company owner',
        );

      if (!(await compareHashContent(dto.currentPassword!, user.password)))
        throw new BadRequestException('Current password is incorrect');

      if (await this.userRepo.exists({ where: { email: dto.email } }))
        throw new ConflictException('Email already in use');

      user.email = dto.email;
    }

    if (dto.phone !== undefined && dto.phone !== user.phone) {
      const taken = await this.userRepo.exists({
        where: {
          phone: dto.phone,
          ...(user.company ? { company: { id: user.company.id } } : {}),
        },
      });

      if (taken) throw new ConflictException('Phone already in use');

      user.phone = dto.phone;
    }

    if (dto.name !== undefined) user.name = dto.name;

    const { password: _password, pin: _pin, ...changes } = user;
    await this.userRepo.save(changes);

    // Keep the employee record (what the owner sees) in step with the login.
    const employee = user.employee
      ? await this.employeeService.syncProfile(user.employee.id, {
          name: user.name,
          phone: user.phone,
        })
      : null;

    if (picture) await this.fileService.replaceImage(picture, employee ?? user);

    return this.getProfile(id);
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

  // Employees sign in with their PIN alone, so it must be unique within the company.
  // Returns false (nothing changed) when the current PIN is wrong.
  async changePin(userId: string, currentPin: string, newPin: string) {
    const user = await this.findWithSecrets({ id: userId });

    if (!user || user.role !== UserRole.EMPLOYEE || !user.company)
      throw new BadRequestException('Only employees have a PIN');

    if (!user.pin || !(await compareHashContent(currentPin, user.pin)))
      return false;

    if (currentPin === newPin)
      throw new BadRequestException('New PIN must be different');

    if (isWeakPin(newPin))
      throw new BadRequestException(
        'PIN is too easy to guess (repeated or sequential digits)',
      );

    if (await this.isPinTaken(user.company.id, newPin, user.id))
      throw new ConflictException('This PIN is not available, choose another');

    await this.userRepo.save({
      id: user.id,
      company: user.company,
      pin: await hashContent(newPin),
    });

    return true;
  }

  // Owner action for an employee who forgot their PIN: a new unique PIN, returned once.
  async resetPin(employeeId: string) {
    const user = await this.userRepo.findOne({
      where: { employee: { id: employeeId } },
      relations: { company: true },
    });

    if (!user) throw new NotFoundException('This employee has no login yet');

    const pin = await this.generateUniquePin(user.company?.id);

    await this.userRepo.save({
      id: user.id,
      company: user.company,
      pin: await hashContent(pin),
    });

    return { pin };
  }

  // helpers

  private async isPinTaken(companyId: string, pin: string, exceptId?: string) {
    const users = await this.findAllWithSecrets({
      role: UserRole.EMPLOYEE,
      company: { id: companyId },
    });

    const matches = await Promise.all(
      users
        .filter((u) => u.id !== exceptId && u.pin)
        .map((u) => compareHashContent(pin, u.pin)),
    );

    return matches.includes(true);
  }

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
