import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class PushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(255)
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, {
    message: 'Not an Expo push token',
  })
  token!: string;

  @ApiProperty({ required: false, enum: ['android', 'ios', 'web', 'unknown'] })
  @IsOptional()
  @IsIn(['android', 'ios', 'web', 'unknown'])
  platform?: string;
}
