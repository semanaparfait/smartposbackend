import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

// Leave one out to keep it as it is.
export class CompanyFeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  services?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  delivery?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  floorMap?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  kitchen?: boolean;
}
