import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Report } from '../report/report.model';

@Table({
  tableName: 'metrics',
  timestamps: true,
})
export class Metrics extends Model {
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

  // Schedule & Cost Metrics
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  delayRate: number; // percentage

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  delayInManMonths: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  estimatedVsActual: number; // ratio

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  schedulePerformanceIndex: number; // SPI

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  costPerformanceIndex: number; // CPI

  // Earned Value Management (EVM) Metrics
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  plannedValue: number; // PV - Expected cost of work scheduled

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  earnedValue: number; // EV - Value of work completed

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  actualCost: number; // AC - Actual cost of work performed

  // Forecasting Metrics (EVM Advanced)
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  budgetAtCompletion: number; // BAC - Total budget (estimated effort)

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  estimateAtCompletion: number; // EAC = AC + (BAC - EV) / CPI

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  varianceAtCompletion: number; // VAC = BAC - EAC

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  toCompletePerformanceIndex: number; // TCPI = (BAC - EV) / (BAC - AC)

  // Testing & Quality Metrics
  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  defectRate: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  passRate: number; // percentage

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  timePerTestCase: number; // hours

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  testCasesPerHour: number;

  @Column({
    type: DataType.FLOAT,
  })
  defectDensity: number; // defects per KLOC (optional)

  @BelongsTo(() => Report)
  report: Report;
}
