import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { WorkflowStep } from './workflow-step.model';
import { Member } from '../member/member.model';

@Table({
  tableName: 'task_workflows',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['screenFunctionId', 'stepId'],
    },
  ],
})
export class TaskWorkflow extends Model {
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

  @ForeignKey(() => WorkflowStep)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  stepId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isCompleted: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completedAt: Date;

  @ForeignKey(() => Member)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  completedBy: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note: string;

  @BelongsTo(() => ScreenFunction, { onDelete: 'CASCADE' })
  screenFunction: ScreenFunction;

  @BelongsTo(() => WorkflowStep, { onDelete: 'CASCADE' })
  step: WorkflowStep;

  @BelongsTo(() => Member)
  completedByMember: Member;
}
