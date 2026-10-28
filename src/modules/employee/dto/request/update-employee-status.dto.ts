import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEmployeeStatusDto {
  @ApiProperty({ description: 'false blocks the login and ends open sessions' })
  @IsBoolean()
  active!: boolean;
}
