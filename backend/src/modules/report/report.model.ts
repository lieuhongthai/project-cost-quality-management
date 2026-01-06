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
import { Commentary } from '../commentary/commentary.model';
import { Metrics } from '../metrics/metrics.model';

export enum ReportScope {
  WEEKLY = 'Weekly',
  PHASE = 'Phase',
  PROJECT = 'Project',
}

@Table({
  tableName: 'reports',
  timestamps: true,
})
export class Report extends Model {
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
    type: DataType.ENUM('Weekly', 'Phase', 'Project'),
    allowNull: false,
  })
  scope: string;

  @Column({
    type: DataType.INTEGER,
  })
  phaseId: number; // for phase-level reports

  @Column({
    type: DataType.STRING,
  })
  phaseName: string; // for phase-level reports

  @Column({
    type: DataType.INTEGER,
  })
  weekNumber: number; // for weekly reports

  @Column({
    type: DataType.INTEGER,
  })
  year: number; // for weekly reports

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  reportDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title: string;

  @BelongsTo(() => Project)
  project: Project;

  @HasMany(() => Commentary)
  commentaries: Commentary[];

  @HasMany(() => Metrics)
  metrics: Metrics[];
}
