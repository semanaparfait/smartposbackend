import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EmployeeParams {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
}

export class EmployeeIdParam extends PickType(EmployeeParams, ['employeeId']) {}
