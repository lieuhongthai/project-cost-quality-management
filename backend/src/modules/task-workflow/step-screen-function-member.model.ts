import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { StepScreenFunction } from './step-screen-function.model';
import { Member } from '../member/member.model';

@Table({
  tableName: 'step_screen_function_members',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['stepScreenFunctionId', 'memberId'],
    },
  ],
})
export class StepScreenFunctionMember extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => StepScreenFunction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  stepScreenFunctionId: number;

  @ForeignKey(() => Member)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  memberId: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  estimatedEffort: number; // in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualEffort: number; // in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  progress: number; // 0-100

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  estimatedStartDate: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  estimatedEndDate: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  actualStartDate: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  actualEndDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note: string;

  @BelongsTo(() => StepScreenFunction, { onDelete: 'CASCADE' })
  stepScreenFunction: StepScreenFunction;

  @BelongsTo(() => Member)
  member: Member;
}
