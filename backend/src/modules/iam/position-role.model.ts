import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Position } from './position.model';
import { Role } from './role.model';

@Table({
  tableName: 'position_roles',
  timestamps: false,
})
export class PositionRole extends Model {
  @ForeignKey(() => Position)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  positionId: number;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
  })
  roleId: number;
}
