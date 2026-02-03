import { IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEffortDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  stageId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  weekNumber: number;

  @IsNotEmpty()
  @Type(() => Number)
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
  @Type(() => Number)
  @IsNumber()
  plannedEffort: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  progress?: number;
}

export class UpdateEffortDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plannedEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  progress?: number;
}

export class BulkEffortDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  stageId: number;

  @IsNotEmpty()
  efforts: CreateEffortDto[];
}
