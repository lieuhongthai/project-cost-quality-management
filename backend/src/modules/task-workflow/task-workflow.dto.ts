import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// ===== Workflow Stage DTOs =====

export class CreateWorkflowStageDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateWorkflowStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  color?: string;
}

export class StageOrderDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  displayOrder: number;
}

export class ReorderStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderDto)
  stageOrders: StageOrderDto[];
}

// ===== Workflow Step DTOs =====

export class CreateWorkflowStepDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  stageId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StepOrderDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  displayOrder: number;
}

export class ReorderStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepOrderDto)
  stepOrders: StepOrderDto[];
}

export class BulkCreateStepsDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  stageId: number;

  @IsArray()
  @IsString({ each: true })
  stepNames: string[];
}

// ===== Task Workflow DTOs =====

export class ToggleTaskWorkflowDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  screenFunctionId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  stepId: number;

  @IsNotEmpty()
  @IsBoolean()
  isCompleted: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  completedBy?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkToggleTaskWorkflowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToggleTaskWorkflowDto)
  items: ToggleTaskWorkflowDto[];
}

export class UpdateTaskWorkflowNoteDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  completedBy?: number;
}

// ===== Initialize Project Workflow =====

export class InitializeProjectWorkflowDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsBoolean()
  useDefaultTemplate?: boolean; // If true, use default stages and steps
}

// ===== Filter/Query DTOs =====

export class TaskWorkflowFilterDto {
  @IsOptional()
  @IsString()
  screenName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stageId?: number;

  @IsOptional()
  @IsEnum(['all', 'completed', 'incomplete'])
  status?: 'all' | 'completed' | 'incomplete';
}

// ===== Assignee DTO =====

export class UpdateScreenFunctionAssigneeDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  screenFunctionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assigneeId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
