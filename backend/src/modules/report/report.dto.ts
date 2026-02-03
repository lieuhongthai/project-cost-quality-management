import { IsNotEmpty, IsString, IsDate, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReportDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsEnum(['Weekly', 'Stage', 'Project'])
  scope: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stageId?: number;

  @IsOptional()
  @IsString()
  stageName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weekNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  reportDate: Date;

  @IsNotEmpty()
  @IsString()
  title: string;
}

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reportDate?: Date;
}
