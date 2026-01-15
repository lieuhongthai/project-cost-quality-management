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

export enum ScreenFunctionType {
  SCREEN = 'Screen',
  FUNCTION = 'Function',
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum Complexity {
  SIMPLE = 'Simple',
  MEDIUM = 'Medium',
  COMPLEX = 'Complex',
}

export enum ScreenFunctionStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

@Table({
  tableName: 'screen_functions',
  timestamps: true,
})
export class ScreenFunction extends Model {
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
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.ENUM('Screen', 'Function'),
    allowNull: false,
    defaultValue: 'Screen',
  })
  type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.ENUM('High', 'Medium', 'Low'),
    allowNull: false,
    defaultValue: 'Medium',
  })
  priority: string;

  @Column({
    type: DataType.ENUM('Simple', 'Medium', 'Complex'),
    allowNull: false,
    defaultValue: 'Medium',
  })
  complexity: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  estimatedEffort: number; // Total estimated effort in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualEffort: number; // Total actual effort in man-hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  progress: number; // percentage (0-100)

  @Column({
    type: DataType.ENUM('Not Started', 'In Progress', 'Completed'),
    defaultValue: 'Not Started',
  })
  status: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  displayOrder: number;

  @BelongsTo(() => Project)
  project: Project;
}
