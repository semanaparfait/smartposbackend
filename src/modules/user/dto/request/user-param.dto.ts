import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UserParams {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}

export class UserIdParam extends PickType(UserParams, ['userId']) {}
