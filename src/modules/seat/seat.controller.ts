import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SeatService } from './seat.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { User } from 'src/common/decorators/user.decorator';
import { Payload } from 'src/util/token.service';
import { SeatStatusEnum } from './entities/seat.entity';
import { UpdateSeatDto } from './dto/request/update-seat.dto';
import { CreateSeatDto } from './dto/request/create-seat.dto';
import { SeatIdParam } from './dto/request/seat-param.dto';

@ApiTags('Seats')
@Controller('seats')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@ApiBearerAuth()
export class SeatController {
  constructor(private readonly service: SeatService) {}

  @Post()
  @ApiOperation({ summary: 'Create seat' })
  createSeat(@User() user: Payload, @Body() dto: CreateSeatDto) {
    return this.service.createSeat(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all seats' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getSeats(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.service.getSeats(user, companyId);
  }

  @Get(':seatId')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get seat by id' })
  getSeat(@User() user: Payload, @Param() { seatId }: SeatIdParam) {
    return this.service.getSeat(user, seatId);
  }

  @Patch(':seatId')
  @ApiOperation({ summary: 'Update seat' })
  updateSeat(
    @User() user: Payload,
    @Param() { seatId }: SeatIdParam,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.service.updateSeat(user, seatId, dto);
  }

  @Patch(':seatId/status/:status')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Change seat status' })
  changeStatus(
    @User() user: Payload,
    @Param() { seatId }: SeatIdParam,
    @Param('status') status: SeatStatusEnum,
  ) {
    return this.service.changeStatus(user, seatId, status);
  }

  @Delete(':seatId/delete')
  @ApiOperation({ summary: 'Delete seat' })
  deleteSeat(@User() user: Payload, @Param() { seatId }: SeatIdParam) {
    return this.service.deleteSeat(user, seatId);
  }
}
