import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { MetricCategory } from './metric-category.model';

@Table({
  tableName: 'task_member_metrics',
  timestamps: true,
})
export class TaskMemberMetric extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => StepScreenFunctionMember)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  stepScreenFunctionMemberId: number;

  @ForeignKey(() => MetricCategory)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  metricCategoryId: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  value: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note: string;

  @BelongsTo(() => StepScreenFunctionMember, { onDelete: 'CASCADE' })
  stepScreenFunctionMember: StepScreenFunctionMember;

  @BelongsTo(() => MetricCategory)
  metricCategory: MetricCategory;
}
