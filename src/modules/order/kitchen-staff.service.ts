import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { compareHashContent } from 'src/util/hashing';
import { LoginThrottleService } from 'src/util/login-throttle.service';
import { User, UserRole } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Station } from '../station/station.entity';

// Who prepares an order. With more than one cook, the one starting an order
// types their PIN on the kitchen screen, so the owner knows who made what.
export interface Preparer {
  id: string;
  name: string;
  // The cook's station; null = any station.
  stationId: string | null;
}

// Sent as 428 so the kitchen screen knows to ask for a PIN (not a wrong one).
export const PIN_NEEDED = 'Enter your PIN to start this order';

@Injectable()
export class KitchenStaffService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly throttle: LoginThrottleService,
  ) {}

  // Active workers whose role lets them prepare orders, with their PIN hash.
  private async staff(companyId: string) {
    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .setFindOptions({
        where: {
          role: UserRole.EMPLOYEE,
          active: true,
          company: { id: companyId },
        },
        relations: { employee: { role: true } },
      })
      .addSelect('user.pin')
      .getMany();
    return users.filter((u) =>
      u.employee?.permissions?.includes('kitchen.prepare'),
    );
  }

  // The person signed in, as a preparer.
  async signedIn(user: Payload): Promise<Preparer> {
    const employee = await this.dataSource
      .getRepository(Employee)
      .findOne({ where: { user: { id: user.sub } } });
    return {
      id: user.sub,
      name: employee?.name ?? user.name ?? '',
      stationId: employee?.stationId ?? null,
    };
  }

  // Who starts an order: with one cook (or none), whoever is signed in; with
  // more, the cook whose PIN is given. Wrong PINs are limited per device.
  async preparer(
    user: Payload,
    companyId: string,
    pin?: string,
  ): Promise<Preparer> {
    const staff = await this.staff(companyId);
    if (staff.length <= 1) return this.signedIn(user);

    if (!pin)
      throw new HttpException(PIN_NEEDED, HttpStatus.PRECONDITION_REQUIRED);

    const key = `kitchen-pin:${user.deviceId ?? user.sub}`;
    this.throttle.assertAllowed(key);
    for (const cook of staff) {
      if (cook.pin && (await compareHashContent(pin, cook.pin))) {
        this.throttle.reset(key);
        return {
          id: cook.id,
          name: cook.employee?.name ?? cook.name,
          stationId: cook.employee?.stationId ?? null,
        };
      }
    }
    this.throttle.recordFailure(key);
    // Not 401: that would sign the kitchen screen out.
    throw new BadRequestException('Wrong PIN. Try again');
  }

  // A cook with a station only works on that station's part.
  async assertStation(cook: Preparer, stationId: string) {
    if (!cook.stationId || cook.stationId === stationId) return;
    const stations = await this.dataSource
      .getRepository(Station)
      .findBy([{ id: cook.stationId }, { id: stationId }]);
    const name = (id: string) =>
      stations.find((s) => s.id === id)?.name ?? 'another station';
    throw new ForbiddenException(
      `${cook.name || 'This cook'} works at ${name(cook.stationId)}. Only ${name(stationId)} staff take ${name(stationId)} orders`,
    );
  }
}
