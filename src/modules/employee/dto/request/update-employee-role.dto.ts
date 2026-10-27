import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmployeeRoleDto } from './create-employee-role.dto';

export class UpdateEmployeeRoleDto extends PartialType(
  OmitType(CreateEmployeeRoleDto, ['companyId'] as const),
) {}
