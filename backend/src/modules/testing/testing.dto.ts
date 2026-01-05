import { IsNotEmpty, IsNumber, IsDate, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestingDto {
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
  totalTestCases: number;

  @IsOptional()
  @IsNumber()
  passedTestCases?: number;

  @IsOptional()
  @IsNumber()
  failedTestCases?: number;

  @IsOptional()
  @IsNumber()
  testingTime?: number;

  @IsOptional()
  @IsNumber()
  defectsDetected?: number;
}

export class UpdateTestingDto {
  @IsOptional()
  @IsNumber()
  totalTestCases?: number;

  @IsOptional()
  @IsNumber()
  passedTestCases?: number;

  @IsOptional()
  @IsNumber()
  failedTestCases?: number;

  @IsOptional()
  @IsNumber()
  testingTime?: number;

  @IsOptional()
  @IsNumber()
  defectsDetected?: number;

  @IsOptional()
  @IsNumber()
  defectRate?: number;

  @IsOptional()
  @IsNumber()
  passRate?: number;

  @IsOptional()
  @IsEnum(['Good', 'Acceptable', 'Poor'])
  status?: string;
}
