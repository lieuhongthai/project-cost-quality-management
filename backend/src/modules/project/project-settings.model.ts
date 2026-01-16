import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Project } from './project.model';

export enum EffortUnit {
  MAN_HOUR = 'man-hour',
  MAN_DAY = 'man-day',
  MAN_MONTH = 'man-month',
}

// Days of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export const DEFAULT_NON_WORKING_DAYS = [0, 6]; // Sunday and Saturday

@Table({
  tableName: 'project_settings',
  timestamps: true,
})
export class ProjectSettings extends Model {
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
    unique: true,
  })
  projectId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 5,
  })
  numberOfMembers: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 8,
  })
  workingHoursPerDay: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 22,
  })
  workingDaysPerMonth: number;

  @Column({
    type: DataType.ENUM('man-hour', 'man-day', 'man-month'),
    allowNull: false,
    defaultValue: 'man-hour',
  })
  defaultEffortUnit: string;

  // Non-working days of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Default: Saturday (6) and Sunday (0)
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: false,
    defaultValue: [0, 6],
  })
  nonWorkingDays: number[];

  // Holidays (array of date strings in YYYY-MM-DD format)
  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    defaultValue: [],
  })
  holidays: string[];

  @BelongsTo(() => Project)
  project: Project;
}
