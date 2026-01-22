import { Column, DataType, Model, Table, BelongsToMany, HasMany } from 'sequelize-typescript';
import { Role } from './role.model';
import { PositionRole } from './position-role.model';
import { User } from './user.model';

@Table({
  tableName: 'positions',
  timestamps: true,
})
export class Position extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isSystem: boolean;

  @BelongsToMany(() => Role, () => PositionRole)
  roles: Role[];

  @HasMany(() => User)
  users: User[];
}
