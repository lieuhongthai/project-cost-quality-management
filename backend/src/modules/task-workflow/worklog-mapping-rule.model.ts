import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';

@Table({
  tableName: 'worklog_mapping_rules',
  timestamps: true,
})
export class WorklogMappingRule extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  projectId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  keyword: string;

  @ForeignKey(() => WorkflowStage)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stageId: number;

  @BelongsTo(() => WorkflowStage)
  stage: WorkflowStage;

  @ForeignKey(() => WorkflowStep)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stepId: number;

  @BelongsTo(() => WorkflowStep)
  step: WorkflowStep;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 100,
  })
  priority: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;
}
