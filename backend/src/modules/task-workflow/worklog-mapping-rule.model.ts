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
import { ScreenFunction } from '../screen-function/screen-function.model';

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
    allowNull: true,
  })
  stageId: number | null;

  @BelongsTo(() => WorkflowStage)
  stage: WorkflowStage;

  @ForeignKey(() => WorkflowStep)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  stepId: number | null;

  @BelongsTo(() => WorkflowStep)
  step: WorkflowStep;

  @ForeignKey(() => ScreenFunction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  screenFunctionId: number | null;

  @BelongsTo(() => ScreenFunction)
  screenFunction: ScreenFunction;

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
