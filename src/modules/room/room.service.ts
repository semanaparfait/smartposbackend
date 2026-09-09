import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room, RoomStatusEnum } from './entities/room.entity';
import { Repository } from 'typeorm';
import { RoomType } from './entities/room-type.entity';
import { FloorMap } from '../floor-map/entities/floor-map.entity';
import { UpdateRoomTypeDto } from './dto/request/update-room-type.dto';
import { CreateRoomTypeDto } from './dto/request/create-room-type.dto';
import { UpdateRoomDto } from './dto/request/update-room.dto';
import { CreateRoomDto } from './dto/request/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(RoomType)
    private readonly roomTypeRepo: Repository<RoomType>,

    @InjectRepository(FloorMap)
    private readonly floorMapRepo: Repository<FloorMap>,
  ) {}

  async createRoomType(dto: CreateRoomTypeDto) {
    const roomType = this.roomTypeRepo.create(dto);

    return this.roomTypeRepo.save(roomType);
  }

  async getRoomTypes() {
    return this.roomTypeRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getRoomType(id: string) {
    const roomType = await this.roomTypeRepo.findOne({
      where: { id },
      relations: { rooms: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    return roomType;
  }

  async updateRoomType(id: string, dto: UpdateRoomTypeDto) {
    const roomType = await this.getRoomType(id);

    Object.assign(roomType, dto);

    return this.roomTypeRepo.save(roomType);
  }

  async deleteRoomType(id: string) {
    const roomType = await this.getRoomType(id);

    return this.roomTypeRepo.remove(roomType);
  }

  async createRoom(dto: CreateRoomDto) {
    const floorMap = await this.floorMapRepo.findOne({
      where: { id: dto.floorMapId },
    });

    if (!floorMap) {
      throw new NotFoundException('Floor map not found');
    }

    const roomType = await this.roomTypeRepo.findOne({
      where: { id: dto.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    const room = this.roomRepo.create({
      name: dto.name,
      status: dto.status,
      floorMap,
      roomType,
    });

    return this.roomRepo.save(room);
  }

  async getRooms() {
    return this.roomRepo.find({
      relations: { floorMap: true, roomType: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getRoom(id: string) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: { floorMap: true, roomType: true, seats: true },
      // relations: ['floorMap', 'roomType', 'seats'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    const room = await this.getRoom(id);

    if (dto.floorMapId) {
      const floorMap = await this.floorMapRepo.findOne({
        where: { id: dto.floorMapId },
      });

      if (!floorMap) {
        throw new NotFoundException('Floor map not found');
      }

      room.floorMap = floorMap;
    }

    if (dto.roomTypeId) {
      const roomType = await this.roomTypeRepo.findOne({
        where: { id: dto.roomTypeId },
      });

      if (!roomType) {
        throw new NotFoundException('Room type not found');
      }

      room.roomType = roomType;
    }

    Object.assign(room, {
      name: dto.name ?? room.name,
      status: dto.status ?? room.status,
    });

    return this.roomRepo.save(room);
  }

  async changeStatus(id: string, status: RoomStatusEnum) {
    const room = await this.getRoom(id);

    room.status = status;

    return this.roomRepo.save(room);
  }

  async deleteRoom(id: string) {
    const room = await this.getRoom(id);

    return this.roomRepo.remove(room);
  }
}
