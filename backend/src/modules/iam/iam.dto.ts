import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength, ArrayNotEmpty } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class CreatePositionDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  roleIds: number[];
}

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}

export class CreateUserDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsInt()
  positionId: number;

  @IsString()
  @IsIn(['default', 'email'])
  passwordMode: 'default' | 'email';

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  positionId?: number;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
