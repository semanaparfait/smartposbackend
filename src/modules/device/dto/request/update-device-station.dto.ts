import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class UpdateDeviceStationDto {
  @ApiProperty({
    nullable: true,
    description:
      'Kitchen station this kitchen display shows; null shows all stations',
  })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  stationId!: string | null;
}
