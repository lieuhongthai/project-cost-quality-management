import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorklogImportBatch } from './worklog-import-batch.model';
import { Member } from '../member/member.model';
import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { ScreenFunction } from '../screen-function/screen-function.model';

@Table({
  tableName: 'worklog_import_items',
  timestamps: true,
})
export class WorklogImportItem extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => WorklogImportBatch)
  @Column({ type: DataType.INTEGER, allowNull: false, onDelete: 'CASCADE' })
  batchId: number;

  @BelongsTo(() => WorklogImportBatch)
  batch: WorklogImportBatch;

  @Column({ type: DataType.INTEGER, allowNull: false })
  rowNumber: number;

  @Column({ type: DataType.JSONB, allowNull: false })
  rawRow: any;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  day?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  fullName?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  email?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  phaseName?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  workDetail?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  workTime?: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  minutes?: number;

  @Column({ type: DataType.FLOAT, allowNull: true })
  effortHours?: number;

  @Column({ type: DataType.FLOAT, allowNull: true })
  effortDays?: number;

  @ForeignKey(() => Member)
  @Column({ type: DataType.INTEGER, allowNull: true })
  memberId?: number;

  @BelongsTo(() => Member)
  member?: Member;

  @ForeignKey(() => WorkflowStage)
  @Column({ type: DataType.INTEGER, allowNull: true })
  stageId?: number;

  @BelongsTo(() => WorkflowStage)
  stage?: WorkflowStage;

  @ForeignKey(() => WorkflowStep)
  @Column({ type: DataType.INTEGER, allowNull: true })
  stepId?: number;

  @BelongsTo(() => WorkflowStep)
  step?: WorkflowStep;

  @ForeignKey(() => ScreenFunction)
  @Column({ type: DataType.INTEGER, allowNull: true })
  screenFunctionId?: number;

  @BelongsTo(() => ScreenFunction)
  screenFunction?: ScreenFunction;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 0 })
  confidence: number;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'pending' })
  status: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isSelected: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason?: string;
}
