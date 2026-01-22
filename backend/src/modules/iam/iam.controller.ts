import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IamService } from './iam.service';
import { CreatePositionDto, CreateRoleDto, CreateUserDto, UpdatePositionDto, UpdateRoleDto, UpdateUserDto } from './iam.dto';

@Controller('iam')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Get('permissions')
  listPermissions() {
    return this.iamService.listPermissions();
  }

  @Get('roles')
  listRoles() {
    return this.iamService.listRoles();
  }

  @Post('roles')
  createRole(@Body() payload: CreateRoleDto) {
    return this.iamService.createRole(payload);
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() payload: UpdateRoleDto) {
    return this.iamService.updateRole(Number(id), payload);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.iamService.deleteRole(Number(id));
  }

  @Get('positions')
  listPositions() {
    return this.iamService.listPositions();
  }

  @Post('positions')
  createPosition(@Body() payload: CreatePositionDto) {
    return this.iamService.createPosition(payload);
  }

  @Put('positions/:id')
  updatePosition(@Param('id') id: string, @Body() payload: UpdatePositionDto) {
    return this.iamService.updatePosition(Number(id), payload);
  }

  @Delete('positions/:id')
  deletePosition(@Param('id') id: string) {
    return this.iamService.deletePosition(Number(id));
  }

  @Get('users')
  listUsers() {
    return this.iamService.listUsers();
  }

  @Post('users')
  createUser(@Body() payload: CreateUserDto) {
    return this.iamService.createUser(payload);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() payload: UpdateUserDto) {
    return this.iamService.updateUser(Number(id), payload);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.iamService.deleteUser(Number(id));
  }
}
