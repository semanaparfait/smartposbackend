import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSeatDto } from './dto/request/create-seat.dto';
import { UpdateSeatDto } from './dto/request/update-seat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from '../room/entities/room.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Seat, SeatStatusEnum } from './entities/seat.entity';
import { Payload } from 'src/util/token.service';
import { scopeCompanyId } from 'src/common/utils/company-scope';

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async createSeat(user: Payload, dto: CreateSeatDto) {
    const room = await this.getRoom(user, dto.roomId);

    const seat = this.seatRepo.create({
      name: dto.name,
      xCoordinate: dto.xCoordinate,
      yCoordinate: dto.yCoordinate,
      status: dto.status,
      room: { id: room.id },
    });

    return this.seatRepo.save(seat);
  }

  async getSeats(user: Payload, companyId?: string) {
    return this.seatRepo.find({
      where: this.seatScope(user, companyId),
      relations: { room: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getSeat(user: Payload, id: string) {
    const seat = await this.findOne({ id, ...this.seatScope(user) });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    return seat;
  }

  async findOne(where: FindOptionsWhere<Seat>) {
    return await this.seatRepo.findOne({
      where,
      relations: { room: { floorMap: { company: true } }, carts: true },
    });
  }

  async updateSeat(user: Payload, id: string, dto: UpdateSeatDto) {
    const seat = await this.getSeat(user, id);

    if (dto.roomId) {
      seat.room = await this.getRoom(user, dto.roomId);
    }

    Object.assign(seat, {
      name: dto.name ?? seat.name,
      xCoordinate: dto.xCoordinate ?? seat.xCoordinate,
      yCoordinate: dto.yCoordinate ?? seat.yCoordinate,
      status: dto.status ?? seat.status,
    });

    return this.seatRepo.save(seat);
  }

  async changeStatus(user: Payload, id: string, status: SeatStatusEnum) {
    const seat = await this.getSeat(user, id);

    seat.status = status;

    return this.seatRepo.save(seat);
  }

  async deleteSeat(user: Payload, id: string) {
    const seat = await this.getSeat(user, id);

    return this.seatRepo.remove(seat);
  }

  // helpers

  // Seats belong to a company through room -> floor map.
  private seatScope(user: Payload, companyId?: string): FindOptionsWhere<Seat> {
    const scope = scopeCompanyId(user, companyId);
    return scope ? { room: { floorMap: { company: { id: scope } } } } : {};
  }

  private async getRoom(user: Payload, id: string) {
    const scope = scopeCompanyId(user);

    const room = await this.roomRepo.findOne({
      where: { id, ...(scope ? { floorMap: { company: { id: scope } } } : {}) },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }
}
