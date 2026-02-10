import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ScreenFunction } from './screen-function.model';
import { Member } from '../member/member.model';

@Table({
  tableName: 'screen_function_default_members',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['screenFunctionId', 'memberId'],
    },
  ],
})
export class ScreenFunctionDefaultMember extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => ScreenFunction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  screenFunctionId: number;

  @ForeignKey(() => Member)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  memberId: number;

  @BelongsTo(() => ScreenFunction, { onDelete: 'CASCADE' })
  screenFunction: ScreenFunction;

  @BelongsTo(() => Member)
  member: Member;
}
