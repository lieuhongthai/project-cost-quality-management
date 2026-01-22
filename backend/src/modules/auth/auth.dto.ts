import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class ChangeCredentialsDto {
  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsOptional()
  @IsString()
  newUsername?: string;
}
