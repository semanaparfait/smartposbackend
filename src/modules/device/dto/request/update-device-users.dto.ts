import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class UpdateDeviceUsersDto {
  @ApiProperty({
    type: [String],
    description:
      'User ids of the staff who may sign in on this device; [] lets anyone on the staff',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  userIds!: string[];
}
