import { IsNotEmpty, IsString, IsDate, IsOptional, IsNumber, IsEnum, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsNotEmpty()
  @IsNumberString()
  estimatedEffort: number;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

export class CreateProjectSettingsDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsNumber()
  numberOfMembers: number;

  @IsNotEmpty()
  @IsNumber()
  workingHoursPerDay: number;

  @IsNotEmpty()
  @IsNumber()
  workingDaysPerMonth: number;
}

export class UpdateProjectSettingsDto {
  @IsOptional()
  @IsNumber()
  numberOfMembers?: number;

  @IsOptional()
  @IsNumber()
  workingHoursPerDay?: number;

  @IsOptional()
  @IsNumber()
  workingDaysPerMonth?: number;
}
