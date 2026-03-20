import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { WorkflowStage } from "./workflow-stage.model";

// Default steps for each stage
export const DEFAULT_WORKFLOW_STEPS: Record<string, string[]> = {
  Requirement: ["Tạo", "Review", "Fix"],
  "Functional Design": ["Tạo", "Review", "Fix"],
  Coding: ["Code", "Review", "Fix"],
  "Unit Test": [
    "Tạo Quan Điểm",
    "Review Quan Điểm",
    "Fix Quan Điểm",
    "Tạo Testcase",
    "Review Testcase",
    "Fix Testcase",
    "Test",
    "Fix bug",
    "Retest",
  ],
  "Integration Test": [
    "Tạo Quan Điểm",
    "Review Quan Điểm",
    "Fix Quan Điểm",
    "Tạo Testcase",
    "Review Testcase",
    "Fix Testcase",
    "Test",
    "Fix bug",
    "Retest",
  ],
  "System Test": ["Tạo Testcase", "Test", "Fix bug", "Retest"],
  "User Test": [
    "Tạo Quan Điểm",
    "Review Quan Điểm",
    "Fix Quan Điểm",
    "Tạo Testcase",
    "Review Testcase",
    "Fix Testcase",
    "Test",
    "Fix bug",
    "Retest",
  ],
};

@Table({
  tableName: "workflow_steps",
  timestamps: true,
})
export class WorkflowStep extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => WorkflowStage)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    onDelete: "CASCADE",
  })
  stageId: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

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

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'When true, this step is used as a fallback step for needs_review records in CSV worklog import. Only one step per project can have this flag.',
  })
  isDefaultImport: boolean;

  @BelongsTo(() => WorkflowStage, { onDelete: "CASCADE" })
  stage: WorkflowStage;
}
