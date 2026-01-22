import { IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  phaseId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  phaseScreenFunctionId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reviewerId?: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reviewRound: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reviewEffort: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectsFound?: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  reviewDate: Date;

  @IsOptional()
  note?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reviewerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reviewRound?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reviewEffort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defectsFound?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reviewDate?: Date;

  @IsOptional()
  note?: string;
}
