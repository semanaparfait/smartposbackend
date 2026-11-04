import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PayTypeEnum, ShiftType } from '../../entities/employee.entity';
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

  @ApiProperty({ enum: PayTypeEnum, required: false, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(PayTypeEnum)
  payType?: PayTypeEnum;

  @ApiProperty({
    required: false,
    description: 'Paid for each delivery, when payType is PER_DELIVERY',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  perDelivery?: number;

  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  shift!: ShiftType;

  @ApiProperty()
  @IsUUID()
  roleId!: string;

  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
