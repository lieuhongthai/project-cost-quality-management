import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Project } from '../project/project.model';

// Default workflow stages template
export const DEFAULT_WORKFLOW_STAGES = [
  { name: 'Requirement', displayOrder: 1 },
  { name: 'Functional Design', displayOrder: 2 },
  { name: 'Coding', displayOrder: 3 },
  { name: 'Unit Test', displayOrder: 4 },
  { name: 'Integration Test', displayOrder: 5 },
  { name: 'System Test', displayOrder: 6 },
  { name: 'User Test', displayOrder: 7 },
] as const;

export enum StageStatus {
  GOOD = 'Good',
  WARNING = 'Warning',
  AT_RISK = 'At Risk',
}

@Table({
  tableName: 'workflow_stages',
  timestamps: true,
})
export class WorkflowStage extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Project)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  projectId: number;

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

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  color: string; // For UI display (e.g., '#4CAF50')

  // Date fields
  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  startDate: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  endDate: string;

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

  // Effort fields (in man-hours, will be converted based on project settings)
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  estimatedEffort: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualEffort: number;

  // Progress and status
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  progress: number; // 0-100

  @Column({
    type: DataType.ENUM('Good', 'Warning', 'At Risk'),
    defaultValue: 'Good',
  })
  status: string;

  @BelongsTo(() => Project, { onDelete: 'CASCADE' })
  project: Project;
}
