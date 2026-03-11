import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateScreenFunctionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(['Screen', 'Function', 'Other'])
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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  autoCreateSteps?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isCatchAll?: boolean;
}

export class UpdateScreenFunctionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['Screen', 'Function', 'Other'])
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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isCatchAll?: boolean;
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

export class CopyScreenFunctionsDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  sourceProjectId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  targetProjectId: number;

  @IsNotEmpty()
  @IsArray()
  screenFunctionIds: number[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  autoCreateSteps?: boolean;
}
