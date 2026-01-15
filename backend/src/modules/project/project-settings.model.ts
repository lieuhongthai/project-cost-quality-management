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

  @BelongsTo(() => Project)
  project: Project;
}
