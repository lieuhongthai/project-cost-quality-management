import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentaryDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reportId: number;

  @IsNotEmpty()
  @IsEnum(['Manual', 'AI Generated'])
  type: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsString()
  author?: string;
}

export class UpdateCommentaryDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsString()
  author?: string;
}

export class GenerateCommentaryDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reportId: number;
}
