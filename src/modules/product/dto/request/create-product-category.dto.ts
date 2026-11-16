import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductCategoryDto {
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

  // Sent as form data: "" (or "null") clears it.
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Kitchen station that makes this category; empty = the first',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === 'null' ? null : value,
  )
  @IsOptional()
  @IsUUID()
  stationId?: string | null;

  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  picture?: any;
}
