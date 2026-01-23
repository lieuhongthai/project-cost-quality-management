import { Inject, Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { Op } from 'sequelize';
import * as bcrypt from 'bcryptjs';
import { Permission } from './permission.model';
import { Role } from './role.model';
import { RolePermission } from './role-permission.model';
import { Position } from './position.model';
import { PositionRole } from './position-role.model';
import { User } from './user.model';
import { PERMISSION_KEYS } from './permissions.constants';
import {
  CreatePositionDto,
  CreateRoleDto,
  CreateUserDto,
  UpdatePositionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './iam.dto';

@Injectable()
export class IamService implements OnModuleInit {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    @Inject('ROLE_REPOSITORY')
    private readonly roleRepository: typeof Role,
    @Inject('PERMISSION_REPOSITORY')
    private readonly permissionRepository: typeof Permission,
    @Inject('ROLE_PERMISSION_REPOSITORY')
    private readonly rolePermissionRepository: typeof RolePermission,
    @Inject('POSITION_REPOSITORY')
    private readonly positionRepository: typeof Position,
    @Inject('POSITION_ROLE_REPOSITORY')
    private readonly positionRoleRepository: typeof PositionRole,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    const superAdminRole = await this.ensureRole('SUPER_ADMIN', true);
    const superAdminPosition = await this.ensurePosition('SUPER_ADMIN', true, [superAdminRole.id]);
    await this.ensureSuperAdminUser(superAdminPosition.id);
  }

  async seedPermissions() {
    const existing = await this.permissionRepository.findAll({
      where: { key: { [Op.in]: PERMISSION_KEYS } },
    });
    const existingKeys = new Set(existing.map((permission) => permission.key));
    const missingKeys = PERMISSION_KEYS.filter((key) => !existingKeys.has(key));
    if (missingKeys.length > 0) {
      await this.permissionRepository.bulkCreate(
        missingKeys.map((key) => ({ key })),
      );
    }
  }

  async ensureRole(name: string, isSystem: boolean) {
    let role = await this.roleRepository.findOne({ where: { name } });
    if (!role) {
      role = await this.roleRepository.create({ name, isSystem });
    } else if (isSystem && !role.isSystem) {
      role.isSystem = true;
      await role.save();
    }
    if (name === 'SUPER_ADMIN') {
      const permissions = await this.permissionRepository.findAll();
      await this.rolePermissionRepository.destroy({ where: { roleId: role.id } });
      await this.rolePermissionRepository.bulkCreate(
        permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      );
    }
    return role;
  }

  async ensurePosition(name: string, isSystem: boolean, roleIds: number[]) {
    let position = await this.positionRepository.findOne({ where: { name } });
    if (!position) {
      position = await this.positionRepository.create({ name, isSystem });
    } else if (isSystem && !position.isSystem) {
      position.isSystem = true;
      await position.save();
    }
    if (roleIds.length > 0) {
      await this.positionRoleRepository.destroy({ where: { positionId: position.id } });
      await this.positionRoleRepository.bulkCreate(
        roleIds.map((roleId) => ({ positionId: position.id, roleId })),
      );
    }
    return position;
  }

  async ensureSuperAdminUser(positionId: number) {
    const existing = await this.userRepository.findOne({ where: { username: 'super-admin' } });
    if (existing) return existing;
    const passwordHash = await bcrypt.hash('123admin', 10);
    return this.userRepository.create({
      username: 'super-admin',
      passwordHash,
      mustChangePassword: true,
      positionId,
    });
  }

  async findUserByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username },
      include: [{ model: Position }],
    });
  }

  async findUserById(userId: number) {
    return this.userRepository.findByPk(userId, { include: [Position] });
  }

  async getUserPermissions(userId: number) {
    const user = await this.userRepository.findByPk(userId, {
      include: [
        {
          model: Position,
          include: [
            {
              model: Role,
              include: [Permission],
            },
          ],
        },
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const permissions = user.position?.roles?.flatMap((role) => role.permissions || []) || [];
    return Array.from(new Set(permissions.map((permission) => permission.key)));
  }

  async listPermissions() {
    return this.permissionRepository.findAll({ order: [['key', 'ASC']] });
  }

  async listRoles() {
    return this.roleRepository.findAll({
      include: [Permission],
      order: [['name', 'ASC']],
    });
  }

  async createRole(payload: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({ where: { name: payload.name } });
    if (existing) {
      throw new BadRequestException('Role already exists');
    }
    const role = await this.roleRepository.create({ name: payload.name, isSystem: false });
    await this.setRolePermissions(role.id, payload.permissionKeys);
    return this.getRoleById(role.id);
  }

  async updateRole(id: number, payload: UpdateRoleDto) {
    const role = await this.roleRepository.findByPk(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('System role cannot be updated');
    }
    if (payload.name) {
      role.name = payload.name;
      await role.save();
    }
    if (payload.permissionKeys) {
      await this.setRolePermissions(role.id, payload.permissionKeys);
    }
    return this.getRoleById(role.id);
  }

  async deleteRole(id: number) {
    const role = await this.roleRepository.findByPk(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('System role cannot be deleted');
    }
    await this.rolePermissionRepository.destroy({ where: { roleId: role.id } });
    await this.positionRoleRepository.destroy({ where: { roleId: role.id } });
    await role.destroy();
    return { success: true };
  }

  async getRoleById(id: number) {
    return this.roleRepository.findByPk(id, { include: [Permission] });
  }

  async listPositions() {
    return this.positionRepository.findAll({
      include: [Role],
      order: [['name', 'ASC']],
    });
  }

  async createPosition(payload: CreatePositionDto) {
    const existing = await this.positionRepository.findOne({ where: { name: payload.name } });
    if (existing) {
      throw new BadRequestException('Position already exists');
    }
    const position = await this.positionRepository.create({
      name: payload.name,
      isSystem: false,
    });
    await this.setPositionRoles(position.id, payload.roleIds);
    return this.getPositionById(position.id);
  }

  async updatePosition(id: number, payload: UpdatePositionDto) {
    const position = await this.positionRepository.findByPk(id);
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    if (position.isSystem) {
      throw new BadRequestException('System position cannot be updated');
    }
    if (payload.name) {
      position.name = payload.name;
      await position.save();
    }
    if (payload.roleIds) {
      await this.setPositionRoles(position.id, payload.roleIds);
    }
    return this.getPositionById(position.id);
  }

  async deletePosition(id: number) {
    const position = await this.positionRepository.findByPk(id);
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    if (position.isSystem) {
      throw new BadRequestException('System position cannot be deleted');
    }
    await this.positionRoleRepository.destroy({ where: { positionId: position.id } });
    await position.destroy();
    return { success: true };
  }

  async getPositionById(id: number) {
    return this.positionRepository.findByPk(id, { include: [Role] });
  }

  async listUsers() {
    return this.userRepository.findAll({
      include: [Position],
      order: [['username', 'ASC']],
    });
  }

  async createUser(payload: CreateUserDto) {
    const position = await this.positionRepository.findByPk(payload.positionId);
    if (!position) {
      throw new BadRequestException('Position not found');
    }
    const existing = await this.userRepository.findOne({ where: { username: payload.username } });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await this.userRepository.create({
      username: payload.username,
      passwordHash,
      mustChangePassword: payload.mustChangePassword ?? true,
      positionId: payload.positionId,
    });
    return this.userRepository.findByPk(user.id, { include: [Position] });
  }

  async updateUser(id: number, payload: UpdateUserDto) {
    const user = await this.userRepository.findByPk(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (payload.username) {
      const existing = await this.userRepository.findOne({ where: { username: payload.username } });
      if (existing && existing.id !== user.id) {
        throw new BadRequestException('Username already exists');
      }
      user.username = payload.username;
    }
    if (payload.positionId) {
      const position = await this.positionRepository.findByPk(payload.positionId);
      if (!position) {
        throw new BadRequestException('Position not found');
      }
      user.positionId = payload.positionId;
    }
    if (payload.mustChangePassword !== undefined) {
      user.mustChangePassword = payload.mustChangePassword;
    }
    await user.save();
    return this.userRepository.findByPk(user.id, { include: [Position] });
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findByPk(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.username === 'super-admin') {
      throw new BadRequestException('Super admin user cannot be deleted');
    }
    await user.destroy();
    return { success: true };
  }

  private async setRolePermissions(roleId: number, permissionKeys: string[]) {
    const permissions = await this.permissionRepository.findAll({
      where: { key: { [Op.in]: permissionKeys } },
    });
    if (permissions.length !== permissionKeys.length) {
      throw new BadRequestException('Invalid permission key');
    }
    await this.rolePermissionRepository.destroy({ where: { roleId } });
    await this.rolePermissionRepository.bulkCreate(
      permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    );
  }

  private async setPositionRoles(positionId: number, roleIds: number[]) {
    const roles = await this.roleRepository.findAll({ where: { id: { [Op.in]: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Invalid role id');
    }
    await this.positionRoleRepository.destroy({ where: { positionId } });
    await this.positionRoleRepository.bulkCreate(
      roleIds.map((roleId) => ({ positionId, roleId })),
    );
  }
}
