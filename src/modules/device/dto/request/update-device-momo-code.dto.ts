import { ApiProperty } from '@nestjs/swagger';
import { Matches, ValidateIf } from 'class-validator';

export class UpdateDeviceMomoCodeDto {
  @ApiProperty({
    example: '123456',
    nullable: true,
    description: 'MoMo pay code for this device; null or "" removes it',
  })
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^\d{4,12}$/, { message: 'MoMo code must be 4 to 12 digits' })
  momoCode!: string | null;
}
