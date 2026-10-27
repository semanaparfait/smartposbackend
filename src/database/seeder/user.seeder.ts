import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { LoggerService } from 'src/common/logger/logger.service';
import { User, UserRole } from 'src/modules/user/entities/user.entity';
import { hashContent } from 'src/util';
import { Repository } from 'typeorm';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private readonly logger: LoggerService,
  ) {}

  // Creates the initial super admin if missing. The password comes from
  // SUPERADMIN_PASSWORD, or is generated and printed once in the server log.
  async seed() {
    const email = process.env.SUPERADMIN_EMAIL || 'admin.sema@gmail.com';

    const exists = await this.userRepo.findOne({
      where: { email, role: UserRole.SUPERADMIN },
    });

    if (exists) return;

    const password =
      process.env.SUPERADMIN_PASSWORD || randomBytes(12).toString('base64url');

    await this.userRepo.save(
      this.userRepo.create({
        name: 'Admin sema',
        email,
        phone: '+567613473984179',
        password: await hashContent(password),
        role: UserRole.SUPERADMIN,
      }),
    );

    if (!process.env.SUPERADMIN_PASSWORD)
      this.logger.warn(
        `Created super admin ${email} with generated password: ${password} (change it after first login)`,
      );
  }
}
