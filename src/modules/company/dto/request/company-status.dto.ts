import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompanyStatusDto {
  @ApiProperty({
    description: 'false terminates the company, true activates it again',
  })
  @IsBoolean()
  active!: boolean;

  @ApiPropertyOptional({ example: 'Subscription not paid' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
