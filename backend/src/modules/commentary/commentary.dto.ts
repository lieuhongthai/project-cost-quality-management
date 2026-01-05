import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateCommentaryDto {
  @IsNotEmpty()
  @IsNumber()
  reportId: number;

  @IsNotEmpty()
  @IsEnum(['Manual', 'AI Generated'])
  type: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
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
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsString()
  author?: string;
}

export class GenerateCommentaryDto {
  @IsNotEmpty()
  @IsNumber()
  reportId: number;
}
