import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere, scopeCompanyId } from 'src/common/utils/company-scope';
import { Employee } from '../employee/entities/employee.entity';
import { FileService } from '../file/file.service';
import { UserRole } from '../user/entities/user.entity';
import { StaffDebt } from './entities/staff-debt.entity';
import {
  DebtPaymentStatusEnum,
  StaffDebtPayment,
} from './entities/staff-debt-payment.entity';
import {
  CreateStaffDebtDto,
  RecordDebtPaymentDto,
  SubmitDebtPaymentDto,
} from './dto/payroll.dto';

const PROOF_SIZE = 'f_auto,q_auto,c_limit,w_1600';
const money = (value: number) => Math.round(value * 100) / 100;
const person = (user: { id: string; name: string } | null) =>
  user ? { id: user.id, name: user.name } : null;

const presentDebt = (debt: StaffDebt) => ({
  id: debt.id,
  kind: debt.kind,
  amount: Number(debt.amount),
  date: debt.date,
  note: debt.note,
  source: debt.source,
  chargedBy: person(debt.user),
  createdAt: debt.createdAt,
});

const presentPayment = (payment: StaffDebtPayment) => ({
  id: payment.id,
  amount: Number(payment.amount),
  method: payment.method,
  status: payment.status,
  proofUrl: payment.proofUrl,
  note: payment.note,
  sentBy: person(payment.user),
  reviewNote: payment.reviewNote,
  reviewedAt: payment.reviewedAt,
  reviewedBy: person(payment.reviewedBy),
  createdAt: payment.createdAt,
});

// What a worker owes: debts minus approved payments. Payments still waiting
// are kept apart, so the worker can't pay the same money twice.
const balance = (debts: StaffDebt[], payments: StaffDebtPayment[]) => {
  const charged = debts.reduce((sum, d) => sum + Number(d.amount), 0);
  const sumOf = (status: DebtPaymentStatusEnum) =>
    payments
      .filter((p) => p.status === status)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = sumOf(DebtPaymentStatusEnum.APPROVED);
  return {
    charged: money(charged),
    paid: money(paid),
    waiting: money(sumOf(DebtPaymentStatusEnum.PENDING)),
    owed: money(Math.max(0, charged - paid)),
  };
};

// Salaries and what workers owe the company, which comes off their salary until
// they pay it back.
@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(StaffDebt)
    private readonly debtRepo: Repository<StaffDebt>,

    @InjectRepository(StaffDebtPayment)
    private readonly paymentRepo: Repository<StaffDebtPayment>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    private readonly fileService: FileService,
  ) {}

  // Every worker: salary, what they owe, and what is left to pay them.
  async overview(user: Payload, companyId?: string) {
    const scope = scopeCompanyId(user, companyId);
    const where = scope ? { company: { id: scope } } : {};
    const [employees, debts, payments] = await Promise.all([
      this.employeeRepo.find({ where, relations: { user: true } }),
      this.debtRepo.find({
        where,
        relations: { employee: true, user: true },
        order: { date: 'DESC', createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where,
        relations: { employee: true, user: true, reviewedBy: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return employees
      .map((employee) => {
        const own = debts.filter((d) => d.employee.id === employee.id);
        const paid = payments.filter((p) => p.employee.id === employee.id);
        const totals = balance(own, paid);
        const salary = Number(employee.salary) || 0;
        return {
          employeeId: employee.id,
          userId: employee.user?.id ?? null,
          name: employee.name,
          active: employee.user?.active !== false,
          salary,
          ...totals,
          // What is left of this month's salary after what they owe.
          toPay: money(Math.max(0, salary - totals.owed)),
          debts: own.map(presentDebt),
          payments: paid.map(presentPayment),
        };
      })
      .filter((w) => w.salary > 0 || w.debts.length || w.payments.length)
      .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
  }

  async charge(user: Payload, dto: CreateStaffDebtDto) {
    const employee = await this.findEmployee(user, dto.employeeId, dto.userId);
    const companyId = scopeCompanyId(user) ?? employee.company.id;

    if (
      dto.source &&
      (await this.debtRepo.existsBy({
        company: { id: companyId },
        source: dto.source,
      }))
    )
      throw new BadRequestException('This was already charged to the worker');

    await this.debtRepo.save(
      this.debtRepo.create({
        company: { id: companyId },
        employee: { id: employee.id },
        kind: dto.kind,
        amount: money(dto.amount),
        date: dto.date,
        note: dto.note ?? null,
        source: dto.source ?? null,
        user: { id: user.sub },
      }),
    );

    return this.overview(user);
  }

  async removeDebt(user: Payload, id: string) {
    const debt = await this.debtRepo.findOne({
      where: { id, ...companyWhere(user) },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    await this.debtRepo.remove(debt);
  }

  // A manager records money given back, or takes it from the salary.
  async record(user: Payload, dto: RecordDebtPaymentDto) {
    const employee = await this.findEmployee(user, dto.employeeId);
    const { owed } = await this.totalsOf(employee.id);

    if (dto.amount > owed)
      throw new BadRequestException(
        owed > 0
          ? `${employee.name} owes only ${owed.toLocaleString()} RWF`
          : `${employee.name} owes nothing`,
      );
    this.assertNotOwn(user, employee);

    await this.paymentRepo.save(
      this.paymentRepo.create({
        company: { id: employee.company.id },
        employee: { id: employee.id },
        amount: money(dto.amount),
        method: dto.method,
        status: DebtPaymentStatusEnum.APPROVED,
        note: dto.note ?? null,
        user: { id: user.sub },
        reviewedAt: new Date(),
        reviewedBy: { id: user.sub },
      }),
    );

    return this.overview(user);
  }

  async approve(user: Payload, id: string) {
    return this.review(user, id, DebtPaymentStatusEnum.APPROVED, null);
  }

  async reject(user: Payload, id: string, note: string) {
    return this.review(user, id, DebtPaymentStatusEnum.REJECTED, note.trim());
  }

  // ---------------- The worker's own ----------------

  async mine(user: Payload) {
    const employee = await this.employeeRepo.findOne({
      where: { user: { id: user.sub }, ...companyWhere(user) },
    });
    if (!employee) return null;

    const [debts, payments] = await Promise.all([
      this.debtRepo.find({
        where: { employee: { id: employee.id } },
        relations: { user: true },
        order: { date: 'DESC', createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where: { employee: { id: employee.id } },
        relations: { user: true, reviewedBy: true },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const totals = balance(debts, payments);
    const salary = Number(employee.salary) || 0;

    return {
      salary,
      ...totals,
      toPay: money(Math.max(0, salary - totals.owed)),
      debts: debts.map(presentDebt),
      payments: payments.map(presentPayment),
    };
  }

  async submit(
    user: Payload,
    dto: SubmitDebtPaymentDto,
    picture?: Express.Multer.File,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: { user: { id: user.sub }, ...companyWhere(user) },
      relations: { company: true },
    });
    if (!employee)
      throw new BadRequestException('Only workers can pay back a debt');

    const { owed, waiting } = await this.totalsOf(employee.id);
    const left = money(owed - waiting);

    if (dto.amount > left)
      throw new BadRequestException(
        left > 0
          ? `You owe ${left.toLocaleString()} RWF that is not already waiting for approval`
          : 'Nothing is left to pay back',
      );

    const proofUrl = picture
      ? await this.fileService.uploadImage(picture, PROOF_SIZE)
      : null;

    try {
      await this.paymentRepo.save(
        this.paymentRepo.create({
          company: { id: employee.company.id },
          employee: { id: employee.id },
          amount: money(dto.amount),
          method: dto.method,
          status: DebtPaymentStatusEnum.PENDING,
          proofUrl,
          note: dto.note ?? null,
          user: { id: user.sub },
        }),
      );
    } catch (error) {
      await this.fileService.deleteByUrl(proofUrl);
      throw error;
    }

    return this.mine(user);
  }

  async withdraw(user: Payload, id: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id, user: { id: user.sub }, ...companyWhere(user) },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== DebtPaymentStatusEnum.PENDING)
      throw new BadRequestException('It was already checked');

    await this.paymentRepo.remove(payment);
    await this.fileService.deleteByUrl(payment.proofUrl);
    return this.mine(user);
  }

  // ---------------- Helpers ----------------

  private async review(
    user: Payload,
    id: string,
    status: DebtPaymentStatusEnum,
    note: string | null,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { employee: { user: true } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== DebtPaymentStatusEnum.PENDING)
      throw new BadRequestException('This payment was already checked');
    this.assertNotOwn(user, payment.employee);

    if (status === DebtPaymentStatusEnum.APPROVED) {
      const { owed } = await this.totalsOf(payment.employee.id);
      if (Number(payment.amount) > owed)
        throw new BadRequestException(
          `${payment.employee.name} now owes only ${owed.toLocaleString()} RWF. Reject this one and ask for a new one`,
        );
    }

    await this.paymentRepo.update(id, {
      status,
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedBy: { id: user.sub },
    });

    return this.overview(user);
  }

  // Nobody settles their own debt; the owner's word stands.
  private assertNotOwn(user: Payload, employee: Employee) {
    if (user.role === UserRole.EMPLOYEE && employee.user?.id === user.sub)
      throw new ForbiddenException(
        'This is your own debt. Someone else has to check it',
      );
  }

  private async totalsOf(employeeId: string) {
    const [debts, payments] = await Promise.all([
      this.debtRepo.find({ where: { employee: { id: employeeId } } }),
      this.paymentRepo.find({ where: { employee: { id: employeeId } } }),
    ]);
    return balance(debts, payments);
  }

  private async findEmployee(
    user: Payload,
    employeeId?: string,
    userId?: string,
  ) {
    const employee = await this.employeeRepo.findOne({
      where: {
        ...(employeeId ? { id: employeeId } : { user: { id: userId } }),
        ...companyWhere(user),
      },
      relations: { company: true, user: true },
    });

    if (!employee)
      throw new NotFoundException(
        'This worker has no employee record, so nothing can be charged',
      );

    return employee;
  }
}
