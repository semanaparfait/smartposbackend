import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  currentPin!: string;

  @ApiProperty({ example: '482913', description: 'Exactly 6 digits' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  newPin!: string;
}
