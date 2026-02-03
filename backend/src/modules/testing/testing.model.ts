import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkflowStage } from '../task-workflow/workflow-stage.model';

@Table({
  tableName: 'testings',
  timestamps: true,
})
export class Testing extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => WorkflowStage)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stageId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  weekNumber: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  weekStartDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  weekEndDate: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalTestCases: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  passedTestCases: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  failedTestCases: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  testingTime: number; // hours

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  defectsDetected: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  defectRate: number; // calculated

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  passRate: number; // calculated (percentage)

  @Column({
    type: DataType.ENUM('Good', 'Acceptable', 'Poor'),
    defaultValue: 'Good',
  })
  status: string;

  @BelongsTo(() => WorkflowStage)
  stage: WorkflowStage;
}
