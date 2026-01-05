import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Report } from '../report/report.model';

export enum CommentaryType {
  MANUAL = 'Manual',
  AI_GENERATED = 'AI Generated',
}

@Table({
  tableName: 'commentaries',
  timestamps: true,
})
export class Commentary extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Report)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  reportId: number;

  @Column({
    type: DataType.ENUM('Manual', 'AI Generated'),
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  version: number;

  @Column({
    type: DataType.STRING,
  })
  author: string; // for manual commentaries

  @BelongsTo(() => Report)
  report: Report;
}
