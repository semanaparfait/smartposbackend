import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PERMISSION_KEYS } from 'src/common/permissions/permissions';

export class CreateEmployeeRoleDto {
  @ApiProperty({
    required: false,
    description: 'Required for super admin; ignored for others',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    type: [String],
    enum: PERMISSION_KEYS,
    example: ['sales.create', 'sales.checkout', 'orders.view_own'],
    description:
      'What the role may do. Keys a permission requires are added automatically. Omitted = everything allowed.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_KEYS, {
    each: true,
    message: ({ value }) =>
      `Unknown permission(s): ${(value as string[])
        .filter((key) => !PERMISSION_KEYS.includes(key))
        .join(', ')}`,
  })
  permissions?: string[];
}
