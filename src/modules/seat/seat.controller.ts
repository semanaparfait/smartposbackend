import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SeatService } from './seat.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeatStatusEnum } from './entities/seat.entity';
import { UpdateSeatDto } from './dto/request/update-seat.dto';
import { CreateSeatDto } from './dto/request/create-seat.dto';
import { SeatIdParam } from './dto/request/seat-param.dto';

@ApiTags('Seats')
@Controller('seats')
export class SeatController {
  constructor(private readonly service: SeatService) {}

  @Post()
  @ApiOperation({ summary: 'Create seat' })
  createSeat(@Body() dto: CreateSeatDto) {
    return this.service.createSeat(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all seats' })
  getSeats() {
    return this.service.getSeats();
  }

  @Get(':seatId')
  @ApiOperation({ summary: 'Get seat by id' })
  getSeat(@Param() { seatId }: SeatIdParam) {
    return this.service.getSeat(seatId);
  }

  @Patch(':seatId')
  @ApiOperation({ summary: 'Update seat' })
  updateSeat(@Param() { seatId }: SeatIdParam, @Body() dto: UpdateSeatDto) {
    return this.service.updateSeat(seatId, dto);
  }

  @Patch(':seatId/status/:status')
  @ApiOperation({ summary: 'Change seat status' })
  changeStatus(
    @Param() { seatId }: SeatIdParam,
    @Param('status') status: SeatStatusEnum,
  ) {
    return this.service.changeStatus(seatId, status);
  }

  @Delete(':seatId/delete')
  @ApiOperation({ summary: 'Delete seat' })
  deleteSeat(@Param() { seatId }: SeatIdParam) {
    return this.service.deleteSeat(seatId);
  }
}
