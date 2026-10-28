import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateCompanyDto } from './create-company.dto';

// Sent as JSON, or multipart/form-data to upload a new logo.
export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['logo'] as const),
) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'New logo image (replaces the current one)',
  })
  @IsOptional()
  logo?: any;
}
