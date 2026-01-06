import { IsNotEmpty, IsNumber, IsDate, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestingDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  phaseId: number;

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
  totalTestCases: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  passedTestCases?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  failedTestCases?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  testingTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectsDetected?: number;
}

export class UpdateTestingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalTestCases?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  passedTestCases?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  failedTestCases?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  testingTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectsDetected?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  passRate?: number;

  @IsOptional()
  @IsEnum(['Good', 'Acceptable', 'Poor'])
  status?: string;
}
