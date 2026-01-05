import { IsNotEmpty, IsString, IsDate, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhaseDto {
  @IsNotEmpty()
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
  @IsNumber()
  estimatedEffort?: number;

  @IsOptional()
  @IsNumber()
  actualEffort?: number;

  @IsOptional()
  @IsNumber()
  progress?: number;

  @IsOptional()
  @IsEnum(['Good', 'Warning', 'At Risk'])
  status?: string;
}
