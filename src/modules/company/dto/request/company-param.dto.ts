import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompanyParams {
  @ApiProperty()
  @IsUUID()
  companyId!: string;
}

export class CompanyIdParam extends PickType(CompanyParams, ['companyId']) {}
