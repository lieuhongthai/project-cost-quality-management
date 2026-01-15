import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScreenFunctionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(['Screen', 'Function'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['Simple', 'Medium', 'Complex'])
  complexity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  progress?: number;

  @IsOptional()
  @IsEnum(['Not Started', 'In Progress', 'Completed'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;
}

export class UpdateScreenFunctionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['Screen', 'Function'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: string;

  @IsOptional()
  @IsEnum(['Simple', 'Medium', 'Complex'])
  complexity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  progress?: number;

  @IsOptional()
  @IsEnum(['Not Started', 'In Progress', 'Completed'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;
}

export class ReorderScreenFunctionDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class ReorderItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  displayOrder: number;
}
