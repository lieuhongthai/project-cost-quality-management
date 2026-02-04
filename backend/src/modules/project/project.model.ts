import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { Report } from '../report/report.model';
import { ProjectSettings } from './project-settings.model';

@Table({
  tableName: 'projects',
  timestamps: true,
})
export class Project extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
  })
  description: string;

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

  @HasMany(() => Report)
  reports: Report[];

  @HasOne(() => ProjectSettings)
  settings: ProjectSettings;
}
