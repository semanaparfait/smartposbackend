import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSeatDto } from './dto/request/create-seat.dto';
import { UpdateSeatDto } from './dto/request/update-seat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from '../room/entities/room.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Seat, SeatStatusEnum } from './entities/seat.entity';

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async createSeat(dto: CreateSeatDto) {
    const room = await this.roomRepo.findOne({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const seat = this.seatRepo.create({
      name: dto.name,
      xCoordinate: dto.xCoordinate,
      yCoordinate: dto.yCoordinate,
      status: dto.status,
      room: { id: room.id },
    });

    return this.seatRepo.save(seat);
  }

  async getSeats() {
    return this.seatRepo.find({
      relations: { room: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getSeat(id: string) {
    const seat = await this.findOne({ id });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    return seat;
  }

  async findOne(where: FindOptionsWhere<Seat>) {
    return await this.seatRepo.findOne({
      where,
      relations: { room: true, carts: true },
    });
  }

  async updateSeat(id: string, dto: UpdateSeatDto) {
    const seat = await this.getSeat(id);

    if (dto.roomId) {
      const room = await this.roomRepo.findOne({
        where: { id: dto.roomId },
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      seat.room = room;
    }

    Object.assign(seat, {
      name: dto.name ?? seat.name,
      xCoordinate: dto.xCoordinate ?? seat.xCoordinate,
      yCoordinate: dto.yCoordinate ?? seat.yCoordinate,
      status: dto.status ?? seat.status,
    });

    return this.seatRepo.save(seat);
  }

  async changeStatus(id: string, status: SeatStatusEnum) {
    const seat = await this.getSeat(id);

    seat.status = status;

    return this.seatRepo.save(seat);
  }

  async deleteSeat(id: string) {
    const seat = await this.getSeat(id);

    return this.seatRepo.remove(seat);
  }
}
