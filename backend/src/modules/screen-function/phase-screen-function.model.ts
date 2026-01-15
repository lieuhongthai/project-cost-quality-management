import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Phase } from '../phase/phase.model';
import { ScreenFunction } from './screen-function.model';
import { Member } from '../member/member.model';

export enum PhaseScreenFunctionStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  SKIPPED = 'Skipped',
}

@Table({
  tableName: 'phase_screen_functions',
  timestamps: true,
})
export class PhaseScreenFunction extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Phase)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  phaseId: number;

  @ForeignKey(() => ScreenFunction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  screenFunctionId: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  estimatedEffort: number; // Estimated effort for this phase in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualEffort: number; // Actual effort for this phase in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  progress: number; // percentage (0-100) for this phase

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

  @ForeignKey(() => Member)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  assigneeId: number;

  @BelongsTo(() => Phase)
  phase: Phase;

  @BelongsTo(() => ScreenFunction)
  screenFunction: ScreenFunction;

  @BelongsTo(() => Member)
  assignee: Member;
}
