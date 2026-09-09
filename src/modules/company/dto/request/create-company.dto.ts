import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ enum: CompanyType })
  @IsEnum(CompanyType)
  type!: CompanyType;
}
