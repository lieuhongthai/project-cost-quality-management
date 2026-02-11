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
import { MetricCategory } from './metric-category.model';

// Default metric types template
export const DEFAULT_METRIC_TYPES = [
  { name: 'Review Issues', description: 'Issues found during review', displayOrder: 1 },
  { name: 'Bugs', description: 'Bugs found during code review or testing', displayOrder: 2 },
  { name: 'Test Cases', description: 'Test case execution results', displayOrder: 3 },
] as const;

// Default categories for each metric type
export const DEFAULT_METRIC_CATEGORIES: Record<string, Array<{ name: string; description?: string }>> = {
  'Review Issues': [
    { name: 'Mập mờ', description: 'Mô tả không rõ ràng' },
    { name: 'Mâu thuẫn', description: 'Mô tả mâu thuẫn với yêu cầu khác' },
    { name: 'Thiếu thông tin', description: 'Thiếu thông tin cần thiết' },
    { name: 'Sai logic', description: 'Logic không đúng' },
    { name: 'Khác', description: 'Các vấn đề khác' },
  ],
  'Bugs': [
    { name: 'Logic', description: 'Lỗi logic nghiệp vụ' },
    { name: 'UI', description: 'Lỗi giao diện' },
    { name: 'Performance', description: 'Lỗi hiệu năng' },
    { name: 'Security', description: 'Lỗi bảo mật' },
    { name: 'Data', description: 'Lỗi dữ liệu' },
    { name: 'Khác', description: 'Các lỗi khác' },
  ],
  'Test Cases': [
    { name: 'Total', description: 'Tổng số test case' },
    { name: 'Passed', description: 'Số test case đạt' },
    { name: 'Failed', description: 'Số test case không đạt' },
  ],
};

@Table({
  tableName: 'metric_types',
  timestamps: true,
})
export class MetricType extends Model {
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
    type: DataType.STRING(255),
    allowNull: true,
  })
  description: string;

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

  @BelongsTo(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @HasMany(() => MetricCategory, { onDelete: 'CASCADE', hooks: true })
  categories: MetricCategory[];
}
