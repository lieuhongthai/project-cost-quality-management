import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { WorklogImportItem } from './worklog-import-item.model';

@Table({
  tableName: 'worklog_import_batches',
  timestamps: true,
})
export class WorklogImportBatch extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  projectId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  sourceFileName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  uploadedBy?: number;

  @HasMany(() => WorklogImportItem)
  items: WorklogImportItem[];
}
