import { IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AIEstimateEffortDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsArray()
  screenFunctionIds?: number[];

  @IsOptional()
  @IsNumber()
  stageId?: number;

  @IsOptional()
  @IsString()
  language?: 'English' | 'Vietnamese' | 'Japanese';
}

export class AIGenerateScheduleDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsNumber()
  stageId: number;

  @IsOptional()
  @IsString()
  language?: 'English' | 'Vietnamese' | 'Japanese';
}

class EstimateItem {
  @IsNotEmpty()
  @IsNumber()
  screenFunctionId: number;

  @IsNotEmpty()
  @IsNumber()
  estimatedEffortHours: number;
}

export class ApplyAIEstimationDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateItem)
  estimates: EstimateItem[];
}

export class AIEstimateStageEffortDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsArray()
  stageIds?: number[];

  @IsOptional()
  @IsString()
  language?: 'English' | 'Vietnamese' | 'Japanese';
}

class StageEstimateItem {
  @IsNotEmpty()
  @IsNumber()
  stageId: number;

  @IsNotEmpty()
  @IsNumber()
  estimatedEffortHours: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ApplyAIStageEstimationDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageEstimateItem)
  estimates: StageEstimateItem[];
}

class ScheduleAssignment {
  @IsNotEmpty()
  @IsNumber()
  stepScreenFunctionId: number;

  @IsNotEmpty()
  @IsNumber()
  memberId: number;

  @IsNotEmpty()
  @IsNumber()
  estimatedEffort: number;

  @IsNotEmpty()
  @IsString()
  estimatedStartDate: string;

  @IsNotEmpty()
  @IsString()
  estimatedEndDate: string;
}

export class ApplyAIScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignment)
  assignments: ScheduleAssignment[];
}
