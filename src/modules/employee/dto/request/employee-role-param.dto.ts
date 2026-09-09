import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EmployeeRoleParams {
  @ApiProperty()
  @IsUUID()
  roleId!: string;
}

export class EmployeeRoleIdParam extends PickType(EmployeeRoleParams, [
  'roleId',
]) {}
