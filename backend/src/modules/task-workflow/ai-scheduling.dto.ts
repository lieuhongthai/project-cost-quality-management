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
