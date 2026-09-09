import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ShiftType } from '../../entities/employee.entity';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  picture?: any;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  salary!: number;

  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  shift!: ShiftType;

  @ApiProperty()
  @IsUUID()
  roleId!: string;

  // @ApiProperty()
  // @IsUUID()
  // companyId!: string;
}
