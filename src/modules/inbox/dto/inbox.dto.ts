import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InboxKindEnum, InboxStatusEnum } from '../entities/inbox-item.entity';

// "Request installation" on the website.
export class InstallationRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  businessName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  businessType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  location!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  branches!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  plan!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(40)
  phone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// "Contact us" on the website.
export class ContactMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  topic!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;
}

export class InboxQueryDto {
  @ApiProperty({ required: false, enum: InboxKindEnum })
  @IsOptional()
  @IsEnum(InboxKindEnum)
  kind?: InboxKindEnum;

  @ApiProperty({ required: false, enum: InboxStatusEnum })
  @IsOptional()
  @IsEnum(InboxStatusEnum)
  status?: InboxStatusEnum;
}

export class UpdateInboxDto {
  @ApiProperty({ required: false, enum: InboxStatusEnum })
  @IsOptional()
  @IsEnum(InboxStatusEnum)
  status?: InboxStatusEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
