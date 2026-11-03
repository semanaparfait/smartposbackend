import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ExtendHoldDto {
  @ApiProperty({
    minimum: 1,
    maximum: 240,
    description: 'Minutes to wait (no more than the company allows)',
  })
  @IsInt()
  @Min(1)
  @Max(240)
  minutes!: number;
}

export class HoldCartDto extends ExtendHoldDto {
  @ApiProperty({ example: 'Jean', description: "The customer's name" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  customerName!: string;
}
