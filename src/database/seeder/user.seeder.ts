import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { User, UserRole } from 'src/modules/user/entities/user.entity';
import { hashContent } from 'src/util';
import { Repository } from 'typeorm';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async seed() {
    const users: Partial<User>[] = [
      {
        name: 'Admin sema',
        email: 'admin.sema@gmail.com',
        phone: '+567613473984179',
        password: '123',
        role: UserRole.ADMIN,
      },
    ];

    for (const user of users) {
      const exists = await this.userRepo.findOne({
        where: {
          email: user.email,
          role: user.role,
        },
      });

      if (!exists) {
        const newUser = this.userRepo.create({
          ...user,
          password: await hashContent(user.password as string),
        });
        await this.userRepo.save(newUser);
      }
    }
  }
}
