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
import { Payload } from 'src/util/token.service';
import {
  companyWhere,
  scopeCompanyId,
  targetCompanyId,
} from 'src/common/utils/company-scope';

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

  async createRoomType(user: Payload, dto: CreateRoomTypeDto) {
    const roomType = this.roomTypeRepo.create({
      name: dto.name,
      company: { id: targetCompanyId(user, dto.companyId) },
    });

    return this.roomTypeRepo.save(roomType);
  }

  async getRoomTypes(user: Payload, companyId?: string) {
    return this.roomTypeRepo.find({
      where: companyWhere(user, companyId),
      order: { createdAt: 'DESC' },
    });
  }

  async getRoomType(user: Payload, id: string) {
    const roomType = await this.roomTypeRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { rooms: true, company: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    return roomType;
  }

  async updateRoomType(user: Payload, id: string, dto: UpdateRoomTypeDto) {
    const roomType = await this.getRoomType(user, id);

    Object.assign(roomType, dto);

    return this.roomTypeRepo.save(roomType);
  }

  async deleteRoomType(user: Payload, id: string) {
    const roomType = await this.getRoomType(user, id);

    return this.roomTypeRepo.remove(roomType);
  }

  async createRoom(user: Payload, dto: CreateRoomDto) {
    const floorMap = await this.getFloorMap(user, dto.floorMapId);

    const roomType = await this.getCompanyRoomType(
      dto.roomTypeId,
      floorMap.company.id,
    );

    const room = this.roomRepo.create({
      name: dto.name,
      status: dto.status,
      floorMap,
      roomType,
    });

    return this.roomRepo.save(room);
  }

  async getRooms(user: Payload, companyId?: string) {
    const scope = scopeCompanyId(user, companyId);

    return this.roomRepo.find({
      where: scope ? { floorMap: { company: { id: scope } } } : {},
      relations: { floorMap: true, roomType: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getRoom(user: Payload, id: string) {
    const scope = scopeCompanyId(user);

    const room = await this.roomRepo.findOne({
      where: { id, ...(scope ? { floorMap: { company: { id: scope } } } : {}) },
      relations: {
        floorMap: { company: true },
        roomType: true,
        seats: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async updateRoom(user: Payload, id: string, dto: UpdateRoomDto) {
    const room = await this.getRoom(user, id);

    if (dto.floorMapId) {
      room.floorMap = await this.getFloorMap(user, dto.floorMapId);
    }

    if (dto.roomTypeId) {
      room.roomType = await this.getCompanyRoomType(
        dto.roomTypeId,
        room.floorMap.company.id,
      );
    }

    Object.assign(room, {
      name: dto.name ?? room.name,
      status: dto.status ?? room.status,
    });

    return this.roomRepo.save(room);
  }

  async changeStatus(user: Payload, id: string, status: RoomStatusEnum) {
    const room = await this.getRoom(user, id);

    room.status = status;

    return this.roomRepo.save(room);
  }

  async deleteRoom(user: Payload, id: string) {
    const room = await this.getRoom(user, id);

    return this.roomRepo.remove(room);
  }

  // helpers

  private async getFloorMap(user: Payload, id: string) {
    const floorMap = await this.floorMapRepo.findOne({
      where: { id, ...companyWhere(user) },
      relations: { company: true },
    });

    if (!floorMap) {
      throw new NotFoundException('Floor map not found');
    }

    return floorMap;
  }

  // A room may only use a room type of the same company as its floor map.
  private async getCompanyRoomType(id: string, companyId: string) {
    const roomType = await this.roomTypeRepo.findOne({
      where: { id, company: { id: companyId } },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    return roomType;
  }
}
