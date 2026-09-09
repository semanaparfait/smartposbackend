import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty()
  @IsString()
  name!: string;
}
