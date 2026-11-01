import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { blankToNull } from 'src/common/utils/form-values';

export class UpdateCartItemNoteDto {
  @ApiProperty({ required: false, nullable: true, example: 'No onions' })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}
