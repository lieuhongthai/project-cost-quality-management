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
  STAGE = 'Stage',
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
    type: DataType.ENUM('Stage', 'Project'),
    allowNull: false,
  })
  scope: string;

  @Column({
    type: DataType.INTEGER,
  })
  stageId: number; // for stage-level reports

  @Column({
    type: DataType.STRING,
  })
  stageName: string; // for stage-level reports

  @Column({
    type: DataType.INTEGER,
  })
  weekNumber: number; // deprecated - kept for backward compatibility

  @Column({
    type: DataType.INTEGER,
  })
  year: number; // deprecated - kept for backward compatibility

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

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  snapshotData: Record<string, any>; // Stores all metrics at the time of report creation

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  snapshotAt: Date; // Timestamp when the snapshot was taken

  @BelongsTo(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @HasMany(() => Commentary, { onDelete: 'CASCADE', hooks: true })
  commentaries: Commentary[];

  @HasMany(() => Metrics, { onDelete: 'CASCADE', hooks: true })
  metrics: Metrics[];
}
