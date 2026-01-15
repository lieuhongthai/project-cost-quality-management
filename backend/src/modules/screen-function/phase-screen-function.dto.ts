import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhaseScreenFunctionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  phaseId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  screenFunctionId: number;

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
  @IsEnum(['Not Started', 'In Progress', 'Completed', 'Skipped'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assigneeId?: number;
}

export class UpdatePhaseScreenFunctionDto {
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
  @IsEnum(['Not Started', 'In Progress', 'Completed', 'Skipped'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assigneeId?: number;
}

export class BulkCreatePhaseScreenFunctionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  phaseId: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkItemDto)
  items: BulkItemDto[];
}

export class BulkItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  screenFunctionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedEffort?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkUpdatePhaseScreenFunctionDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  items: BulkUpdateItemDto[];
}

export class BulkUpdateItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  id: number;

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
  @IsEnum(['Not Started', 'In Progress', 'Completed', 'Skipped'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assigneeId?: number;
}
