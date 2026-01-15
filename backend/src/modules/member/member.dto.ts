import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, IsEmail, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMemberDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsEnum(['PM', 'TL', 'BA', 'DEV', 'QA', 'Comtor', 'Designer', 'DevOps', 'Other'])
  role: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  availability?: number;

  @IsOptional()
  @IsEnum(['Active', 'Inactive'])
  status?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['PM', 'TL', 'BA', 'DEV', 'QA', 'Comtor', 'Designer', 'DevOps', 'Other'])
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  availability?: number;

  @IsOptional()
  @IsEnum(['Active', 'Inactive'])
  status?: string;
}
