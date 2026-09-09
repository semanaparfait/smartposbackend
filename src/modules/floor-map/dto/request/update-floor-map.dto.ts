import { PartialType } from '@nestjs/swagger';
import { CreateFloorMapDto } from './create-floor-map.dto';

export class UpdateFloorMapDto extends PartialType(CreateFloorMapDto) {}
