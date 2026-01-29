import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkflowStage } from './workflow-stage.model';

// Default steps for each stage
export const DEFAULT_WORKFLOW_STEPS: Record<string, string[]> = {
  'Requirement': ['Tạo', 'Review', 'Fix'],
  'Functional Design': ['Tạo', 'Review', 'Fix'],
  'Coding': ['Code', 'Review', 'Fix', 'Tạo QB', 'Review QB', 'Fix QB', 'Tạo TC', 'Review TC', 'Fix TC'],
  'Unit Test': ['Test', 'Fix bug', 'Retest', 'Tạo QB', 'Review'],
  'Integration Test': ['Tạo', 'Fix TC', 'Review', 'Test', 'Fix bug', 'Retest'],
  'System Test': ['Tạo QB', 'Tạo TC', 'Review', 'Fix', 'Test', 'Fix bug', 'Retest'],
  'User Test': ['Test', 'Fix bug', 'Retest'],
};

@Table({
  tableName: 'workflow_steps',
  timestamps: true,
})
export class WorkflowStep extends Model {
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
    onDelete: 'CASCADE',
  })
  stageId: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  displayOrder: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @BelongsTo(() => WorkflowStage, { onDelete: 'CASCADE' })
  stage: WorkflowStage;
}
