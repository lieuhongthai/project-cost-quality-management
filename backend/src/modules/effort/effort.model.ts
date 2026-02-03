import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkflowStage } from '../task-workflow/workflow-stage.model';

@Table({
  tableName: 'efforts',
  timestamps: true,
})
export class Effort extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => WorkflowStage)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stageId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  weekNumber: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  weekStartDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  weekEndDate: Date;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  plannedEffort: number; // man-months

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualEffort: number; // man-months

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  progress: number; // percentage (0-100)

  @BelongsTo(() => WorkflowStage)
  stage: WorkflowStage;
}
