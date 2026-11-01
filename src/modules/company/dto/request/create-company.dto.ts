import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CompanyType } from '../../entities/company.entity';

export class CreateCompanyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  phone_number!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tin?: string;

  @ApiProperty({ enum: CompanyType })
  @IsEnum(CompanyType)
  type!: CompanyType;
}
