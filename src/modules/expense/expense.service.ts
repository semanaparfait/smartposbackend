import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  scopeCompanyId,
  targetCompanyId,
} from 'src/common/utils/company-scope';
import { Employee } from '../employee/entities/employee.entity';
import { FileService } from '../file/file.service';
import { UserRole } from '../user/entities/user.entity';
import {
  Expense,
  ExpenseRepeatEnum,
  ExpenseStatusEnum,
} from './entities/expense.entity';
import {
  CreateExpenseDto,
  SubmitExpenseDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

const PROOF_SIZE = 'f_auto,q_auto,c_limit,w_1600';

const person = (user: { id: string; name: string } | null) =>
  user ? { id: user.id, name: user.name } : null;

const present = (expense: Expense) => {
  const { user, reviewedBy, company: _company, ...rest } = expense;
  return {
    ...rest,
    recordedBy: person(user),
    reviewedBy: person(reviewedBy),
  };
};

// What the company spends to run. Profit is worked out in the app from these,
// the sales and the services. Workers can submit what they paid, with a proof;
// it counts once someone who manages expenses approves it.
@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    private readonly fileService: FileService,
  ) {}

  async list(user: Payload, companyId?: string) {
    const expenses = await this.expenseRepo.find({
      where: companyWhere(user, companyId),
      relations: { user: true, reviewedBy: true },
      order: { startDate: 'DESC', createdAt: 'DESC' },
    });

    return expenses.map(present);
  }

  async create(user: Payload, dto: CreateExpenseDto) {
    const { companyId, ...fields } = dto;
    this.assertDates(fields.repeat, fields.startDate, fields.endDate);

    const saved = await this.expenseRepo.save(
      this.expenseRepo.create({
        ...fields,
        title: fields.title.trim(),
        status: ExpenseStatusEnum.APPROVED,
        company: { id: targetCompanyId(user, companyId) },
        user: { id: user.sub },
      }),
    );

    return this.getOne(user, saved.id);
  }

  async update(user: Payload, id: string, dto: UpdateExpenseDto) {
    const expense = await this.find(user, id);
    const { companyId: _companyId, ...fields } = dto;
    const next = { ...expense, ...fields };

    this.assertDates(next.repeat, next.startDate, next.endDate);

    await this.expenseRepo.update(id, {
      ...fields,
      ...(fields.title ? { title: fields.title.trim() } : {}),
    });

    return this.getOne(user, id);
  }

  async remove(user: Payload, id: string) {
    const expense = await this.find(user, id);
    await this.expenseRepo.remove(expense);
    await this.fileService.deleteByUrl(expense.proofUrl);
  }

  // ---------------- Submitted by workers ----------------

  async submit(
    user: Payload,
    dto: SubmitExpenseDto,
    picture?: Express.Multer.File,
  ) {
    if (!picture)
      throw new BadRequestException(
        'Add a photo of the receipt or bill as proof',
      );

    const proofUrl = await this.fileService.uploadImage(picture, PROOF_SIZE);

    try {
      const saved = await this.expenseRepo.save(
        this.expenseRepo.create({
          title: dto.title.trim(),
          category: dto.category,
          amount: dto.amount,
          repeat: ExpenseRepeatEnum.ONCE,
          startDate: dto.paidOn,
          note: dto.note ?? null,
          paidFrom: dto.paidFrom,
          proofUrl,
          status: ExpenseStatusEnum.PENDING,
          company: { id: targetCompanyId(user) },
          user: { id: user.sub },
        }),
      );

      return this.getOne(user, saved.id);
    } catch (error) {
      await this.fileService.deleteByUrl(proofUrl);
      throw error;
    }
  }

  async mine(user: Payload) {
    const expenses = await this.expenseRepo.find({
      where: { ...companyWhere(user), user: { id: user.sub } },
      relations: { user: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    return expenses.map(present);
  }

  // A worker takes back a submission nobody has looked at yet.
  async withdraw(user: Payload, id: string) {
    const expense = await this.find(user, id);

    if (expense.user?.id !== user.sub)
      throw new ForbiddenException('You can only take back your own expense');
    if (expense.status !== ExpenseStatusEnum.PENDING)
      throw new BadRequestException('It was already checked');

    await this.expenseRepo.remove(expense);
    await this.fileService.deleteByUrl(expense.proofUrl);
  }

  async approve(user: Payload, id: string, note?: string | null) {
    return this.review(user, id, ExpenseStatusEnum.APPROVED, note ?? null);
  }

  async reject(user: Payload, id: string, note: string) {
    return this.review(user, id, ExpenseStatusEnum.REJECTED, note.trim());
  }

  private async review(
    user: Payload,
    id: string,
    status: ExpenseStatusEnum,
    note: string | null,
  ) {
    const expense = await this.find(user, id);

    if (expense.status !== ExpenseStatusEnum.PENDING)
      throw new BadRequestException('This expense was already checked');

    // Nobody approves what they spent themselves; the owner's word stands.
    if (user.role === UserRole.EMPLOYEE && expense.user?.id === user.sub)
      throw new ForbiddenException(
        'You submitted this yourself. Someone else has to check it',
      );

    await this.expenseRepo.update(id, {
      status,
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedBy: { id: user.sub },
    });

    return this.getOne(user, id);
  }

  // Monthly salaries of the company's workers whose login is not turned off.
  async salaries(user: Payload, companyId?: string) {
    const scope = scopeCompanyId(user, companyId);
    const employees = await this.employeeRepo.find({
      where: scope ? { company: { id: scope } } : {},
      relations: { user: true },
    });
    const paid = employees.filter(
      (e) => Number(e.salary) > 0 && e.user?.active !== false,
    );

    return {
      monthly: paid.reduce((sum, e) => sum + Number(e.salary), 0),
      workers: paid
        .map((e) => ({ id: e.id, name: e.name, salary: Number(e.salary) }))
        .sort((a, b) => b.salary - a.salary),
    };
  }

  async getOne(user: Payload, id: string) {
    return present(await this.find(user, id));
  }

  private async find(user: Payload, id: string) {
    const expense = await this.expenseRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { user: true, reviewedBy: true },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    return expense;
  }

  private assertDates(
    repeat: ExpenseRepeatEnum | undefined,
    start: string,
    end: string | null | undefined,
  ) {
    if (end && (!repeat || repeat === ExpenseRepeatEnum.ONCE))
      throw new BadRequestException('Only a repeating cost has an end date');
    if (end && end < start)
      throw new BadRequestException('The end date is before the start date');
  }
}
