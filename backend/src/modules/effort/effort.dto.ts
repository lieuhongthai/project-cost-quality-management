import { IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEffortDto {
  @IsNotEmpty()
  @IsNumber()
  phaseId: number;

  @IsNotEmpty()
  @IsNumber()
  weekNumber: number;

  @IsNotEmpty()
  @IsNumber()
  year: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  weekStartDate: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  weekEndDate: Date;

  @IsNotEmpty()
  @IsNumber()
  plannedEffort: number;

  @IsOptional()
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @IsNumber()
  progress?: number;
}

export class UpdateEffortDto {
  @IsOptional()
  @IsNumber()
  plannedEffort?: number;

  @IsOptional()
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @IsNumber()
  progress?: number;
}

export class BulkEffortDto {
  @IsNotEmpty()
  @IsNumber()
  phaseId: number;

  @IsNotEmpty()
  efforts: CreateEffortDto[];
}
