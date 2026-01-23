import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Role } from './role.model';
import { Permission } from './permission.model';

@Table({
  tableName: 'role_permissions',
  timestamps: false,
})
export class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  roleId: number;

  @ForeignKey(() => Permission)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  permissionId: number;
}
