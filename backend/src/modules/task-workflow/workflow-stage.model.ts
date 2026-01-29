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

  @BelongsTo(() => Project)
  project: Project;
}
