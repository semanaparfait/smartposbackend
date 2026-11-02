import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { toNumberOrNull } from 'src/common/utils/form-values';
import { PERMISSION_KEYS } from 'src/common/permissions/permissions';

const isPermissionKey = IsIn(PERMISSION_KEYS, {
  each: true,
  message: ({ value }) =>
    `Unknown permission(s): ${(value as string[])
      .filter((key) => !PERMISSION_KEYS.includes(key))
      .join(', ')}`,
});

// Omit a list to keep it as it is; send [] to clear it.
export class UpdateEmployeePermissionsDto {
  @ApiProperty({
    required: false,
    type: [String],
    enum: PERMISSION_KEYS,
    example: ['sales.credit'],
    description:
      'Given to this employee on top of their role. Keys a permission requires are added automatically.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @isPermissionKey
  extraPermissions?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    enum: PERMISSION_KEYS,
    example: ['sales.cancel'],
    description:
      'Taken away from what the role gives, for this employee only. Permissions that require one of these are taken away too.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @isPermissionKey
  removedPermissions?: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Most this worker may give on credit in one sale. Required when they can sell on credit.',
  })
  @Transform(toNumberOrNull)
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'The credit limit must be above 0' })
  creditLimit?: number | null;
}
