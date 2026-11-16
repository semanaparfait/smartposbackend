import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Payload } from 'src/util/token.service';
import { companyWhere, targetCompanyId } from 'src/common/utils/company-scope';
import { Station } from './station.entity';
import { CreateStationDto, UpdateStationDto } from './dto/station.dto';

@Injectable()
export class StationService {
  constructor(
    @InjectRepository(Station) private readonly repo: Repository<Station>,
  ) {}

  list(user: Payload, companyId?: string) {
    return this.repo.find({
      where: companyWhere(user, companyId),
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async get(user: Payload, id: string) {
    const station = await this.repo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { company: true },
    });
    if (!station) throw new NotFoundException('Station not found');
    return station;
  }

  async create(user: Payload, dto: CreateStationDto) {
    const companyId = targetCompanyId(user, dto.companyId);
    await this.assertNameFree(companyId, dto.name);

    // New stations go to the end unless a place is given.
    const last = await this.repo.findOne({
      where: { company: { id: companyId } },
      order: { sortOrder: 'DESC' },
    });

    const saved = await this.repo.save(
      this.repo.create({
        company: { id: companyId },
        name: dto.name,
        sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
      }),
    );
    return this.get(user, saved.id).then(strip);
  }

  async update(user: Payload, id: string, dto: UpdateStationDto) {
    const station = await this.get(user, id);
    if (dto.name !== undefined && dto.name !== station.name) {
      await this.assertNameFree(station.company.id, dto.name, id);
      station.name = dto.name;
    }
    if (dto.sortOrder !== undefined) station.sortOrder = dto.sortOrder;
    await this.repo.save(station);
    return strip(await this.get(user, id));
  }

  // Refused while an open order still waits on this station, so no food is lost
  // between screens. Categories, products and screens on it go back to the
  // default (the database sets their station to null).
  async remove(user: Payload, id: string) {
    const station = await this.get(user, id);
    const rows: { count: number }[] = await this.repo.query(
      `SELECT count(*)::int AS count FROM orders
        WHERE company_id = $1
          AND status <> 'CANCELLED'
          AND station_status -> $2 ->> 'status' IN ('PENDING', 'PREPARING', 'READY')`,
      [station.company.id, id],
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count)
      throw new ConflictException(
        `${station.name} still has ${count} order(s) to finish. Finish them first`,
      );
    await this.repo.remove(station);
  }

  private async assertNameFree(companyId: string, name: string, id?: string) {
    const same = await this.repo
      .createQueryBuilder('s')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('lower(s.name) = lower(:name)', { name })
      .getOne();
    if (same && same.id !== id)
      throw new BadRequestException(
        `There is already a station called ${name}`,
      );
  }

  // Checks a station id given for a category, product or device.
  async assertInCompany(companyId: string, stationId: string) {
    const found = await this.repo.exists({
      where: { id: stationId, company: { id: companyId } },
    });
    if (!found) throw new BadRequestException('Station not found');
  }
}

// Answers without the company it belongs to.
const strip = (station: Station): Omit<Station, 'company'> => {
  const copy: Partial<Station> = { ...station };
  delete copy.company;
  return copy as Omit<Station, 'company'>;
};

// Which station makes each product: its own station, else its category's, else
// the company's first station. Empty when the company has no stations. Only
// products sent to the kitchen are routed.
export async function stationsFor(
  manager: EntityManager,
  companyId: string,
  productIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const ids = [...new Set(productIds)];
  if (!ids.length) return result;

  const first = await manager.findOne(Station, {
    where: { company: { id: companyId } },
    order: { sortOrder: 'ASC', createdAt: 'ASC' },
  });
  if (!first) return result;

  const rows: { id: string; station: string | null }[] = await manager.query(
    `SELECT p.id, COALESCE(p.station_id, c.station_id) AS station
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = ANY($1) AND p.send_to_kitchen = true`,
    [ids],
  );
  for (const r of rows) result.set(r.id, r.station ?? first.id);
  return result;
}

export const findStations = (manager: EntityManager, ids: string[]) =>
  ids.length
    ? manager.find(Station, { where: { id: In(ids) } })
    : Promise.resolve([] as Station[]);
