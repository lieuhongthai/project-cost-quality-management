import { Permission } from './permission.model';
import { Role } from './role.model';
import { RolePermission } from './role-permission.model';
import { Position } from './position.model';
import { PositionRole } from './position-role.model';
import { User } from './user.model';

export const iamProviders = [
  {
    provide: 'USER_REPOSITORY',
    useValue: User,
  },
  {
    provide: 'ROLE_REPOSITORY',
    useValue: Role,
  },
  {
    provide: 'PERMISSION_REPOSITORY',
    useValue: Permission,
  },
  {
    provide: 'ROLE_PERMISSION_REPOSITORY',
    useValue: RolePermission,
  },
  {
    provide: 'POSITION_REPOSITORY',
    useValue: Position,
  },
  {
    provide: 'POSITION_ROLE_REPOSITORY',
    useValue: PositionRole,
  },
];
