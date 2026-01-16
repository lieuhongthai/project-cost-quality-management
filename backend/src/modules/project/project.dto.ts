import { IsNotEmpty, IsString, IsDate, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
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
  @Type(() => Number)
  @IsNumber()
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
}

export class CreateProjectSettingsDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  numberOfMembers: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  workingHoursPerDay: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  workingDaysPerMonth: number;

  @IsOptional()
  @IsEnum(['man-hour', 'man-day', 'man-month'])
  defaultEffortUnit?: string;

  @IsOptional()
  @IsArray()
  nonWorkingDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @IsOptional()
  @IsArray()
  holidays?: string[]; // Array of YYYY-MM-DD strings
}

export class UpdateProjectSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  numberOfMembers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  workingHoursPerDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  workingDaysPerMonth?: number;

  @IsOptional()
  @IsEnum(['man-hour', 'man-day', 'man-month'])
  defaultEffortUnit?: string;

  @IsOptional()
  @IsArray()
  nonWorkingDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @IsOptional()
  @IsArray()
  holidays?: string[]; // Array of YYYY-MM-DD strings
}
