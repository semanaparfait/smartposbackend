import {
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
import { hashContent } from 'src/util';
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

  async create(userId: string, dto: CreateUserDto) {
    const pswd = randomBytes(9).toString('base64').slice(0, 10);

    let company;
    let pin;
    let employee;

    if (dto.companyCode)
      company = await this.companyService.getOne({ code: dto.companyCode });

    if (dto.role === UserRole.EMPLOYEE) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();

      employee = await this.employeeService.getEmployee(userId, {
        email: dto.email,
      });
    }

    const user = this.userRepo.create({
      ...dto,
      password: await hashContent(pswd),
      pin: await hashContent(pin),
      ...(employee ? { employee: { id: employee.id } } : {}),
      ...(company ? { company: { id: company?.id } } : {}),
    });
    await this.userRepo.save(user);

    user.password = pswd;
    user.pin = pin;
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

  async update(user: Partial<User>): Promise<User> {
    const existingUser = await this.userRepo.preload(user);

    if (!existingUser) throw new NotFoundException('User not found');

    return await this.userRepo.save(existingUser);
  }

  async remove(id: string) {
    const user = await this.getOne({ id });
    this.userRepo.delete(user.id);
    return user;
  }

  // helpers
}
