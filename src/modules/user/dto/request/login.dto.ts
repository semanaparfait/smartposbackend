import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty({
    required: false,
    enum: ['web'],
    description:
      'web: a short sign-in renewed with an httpOnly cookie (the website)',
  })
  @IsOptional()
  @IsIn(['web'])
  client?: 'web';
}
