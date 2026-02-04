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
  'Coding': ['Code', 'Review', 'Fix'],
  'Unit Test': ['Tạo QĐ', 'Review QĐ', 'Fix QĐ', 'Tạo TC', 'Review TC', 'Fix TC', 'Test', 'Fix bug', 'Retest', 'Tạo QB', 'Review'],
  'Integration Test': ['Tạo QĐ', 'Review QĐ', 'Fix QĐ', 'Tạo TC', 'Review TC', 'Fix TC', 'Test', 'Fix bug', 'Retest', 'Tạo QB', 'Review'],
  'System Test': ['Tạo TC', 'Test', 'Fix bug', 'Retest'],
  'User Test': ['Tạo QĐ', 'Tạo TC', 'Review QĐ&TC', 'Fix', 'Test', 'Fix bug', 'Retest'],
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
    allowNull: true,
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
