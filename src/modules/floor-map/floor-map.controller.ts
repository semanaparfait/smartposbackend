import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FloorMapService } from './floor-map.service';
import { CreateFloorMapDto } from './dto/request/create-floor-map.dto';
import { UpdateFloorMapDto } from './dto/request/update-floor-map.dto';
import { FloorMapIdParam } from './dto/request/floor-map-param.dto';

@ApiTags('Floor Maps')
@Controller('floor-maps')
export class FloorMapController {
  constructor(private readonly service: FloorMapService) {}

  @Post()
  @ApiOperation({ summary: 'Create floor map' })
  create(@Body() dto: CreateFloorMapDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all floor maps' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':floorMapId')
  @ApiOperation({ summary: 'Get floor map by id' })
  findOne(@Param() { floorMapId }: FloorMapIdParam) {
    return this.service.findOne(floorMapId);
  }

  @Patch(':floorMapId')
  @ApiOperation({ summary: 'Update floor map' })
  update(
    @Param() { floorMapId }: FloorMapIdParam,
    @Body() dto: UpdateFloorMapDto,
  ) {
    return this.service.update(floorMapId, dto);
  }

  @Delete(':floorMapId/delete')
  @ApiOperation({ summary: 'Delete floor map' })
  remove(@Param() { floorMapId }: FloorMapIdParam) {
    return this.service.remove(floorMapId);
  }
}
