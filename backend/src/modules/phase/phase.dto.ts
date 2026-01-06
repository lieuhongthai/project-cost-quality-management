import { IsNotEmpty, IsString, IsDate, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PhaseOrderDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  displayOrder: number;
}

export class CreatePhaseDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsEnum(['Functional Design', 'Coding', 'Unit Test', 'Integration Test', 'System Test'])
  name: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  estimatedEffort: number;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsEnum(['Functional Design', 'Coding', 'Unit Test', 'Integration Test', 'System Test'])
  name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

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
  @IsEnum(['Good', 'Warning', 'At Risk'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;
}

export class ReorderPhasesDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseOrderDto)
  phaseOrders: PhaseOrderDto[];
}
