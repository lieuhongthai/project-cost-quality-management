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
// import { Testing } from '../testing/testing.model';

// Default phase names (for reference, but not enforced)
export const DEFAULT_PHASE_NAMES = [
  'Requirement',
  'Functional Design',
  'Coding',
  'Unit Test',
  'Integration Test',
  'System Test',
  'User Test',
] as const;

@Table({
  tableName: 'phases',
  timestamps: true,
})
export class Phase extends Model {
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

  // Changed from ENUM to STRING for flexibility - allows custom phase names
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
  })
  endDate: Date;

  @Column({
    type: DataType.DATE,
  })
  actualStartDate: Date;

  @Column({
    type: DataType.DATE,
  })
  actualEndDate: Date;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  estimatedEffort: number; // man-months

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

  @Column({
    type: DataType.ENUM('Good', 'Warning', 'At Risk'),
    defaultValue: 'Good',
  })
  status: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  displayOrder: number; // Order for displaying phases

  @BelongsTo(() => Project)
  project: Project;

  // @HasMany(() => Testing)
  // testings: Testing[];
}
