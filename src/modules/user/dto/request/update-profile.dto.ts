import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

// What a user may change about themselves. Role, company and status are managed by
// owners / super admin, so sending them is rejected.
export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'Not for employees; requires currentPassword',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Required when changing email',
  })
  @ValidateIf((dto: UpdateProfileDto) => dto.email !== undefined)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'New profile picture',
  })
  @IsOptional()
  picture?: any;
}
