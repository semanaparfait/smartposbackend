import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class RecipeLineDto {
  @ApiProperty()
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ example: 0.15, description: "In the ingredient's unit" })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity!: number;
}

// The whole recipe: it replaces what was there.
export class SaveRecipeDto {
  @ApiProperty({ type: [RecipeLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  @ArrayUnique((line: RecipeLineDto) => line.ingredientId, {
    message: 'Each ingredient can only be listed once',
  })
  items!: RecipeLineDto[];
}
