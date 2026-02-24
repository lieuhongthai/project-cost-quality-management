import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class AIPlanAllDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsString()
  language?: 'English' | 'Vietnamese' | 'Japanese';

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}
