import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkflowStep } from './workflow-step.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { Member } from '../member/member.model';

export enum StepScreenFunctionStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  SKIPPED = 'Skipped',
}

@Table({
  tableName: 'step_screen_functions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['stepId', 'screenFunctionId'],
    },
  ],
})
export class StepScreenFunction extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => WorkflowStep)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  stepId: number;

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
    allowNull: true,
  })
  assigneeId: number;

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
    type: DataType.ENUM('Not Started', 'In Progress', 'Completed', 'Skipped'),
    defaultValue: 'Not Started',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note: string;

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

  @BelongsTo(() => WorkflowStep, { onDelete: 'CASCADE' })
  step: WorkflowStep;

  @BelongsTo(() => ScreenFunction, { onDelete: 'CASCADE' })
  screenFunction: ScreenFunction;

  @BelongsTo(() => Member)
  assignee: Member;
}
