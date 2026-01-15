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

export enum MemberRole {
  PM = 'PM',
  TL = 'TL',
  BA = 'BA',
  DEV = 'DEV',
  QA = 'QA',
  COMTOR = 'Comtor',
  DESIGNER = 'Designer',
  DEVOPS = 'DevOps',
  OTHER = 'Other',
}

export enum MemberStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Table({
  tableName: 'members',
  timestamps: true,
})
export class Member extends Model {
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
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.ENUM('PM', 'TL', 'BA', 'DEV', 'QA', 'Comtor', 'Designer', 'DevOps', 'Other'),
    allowNull: false,
    defaultValue: 'DEV',
  })
  role: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  yearsOfExperience: number;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
    defaultValue: [],
  })
  skills: string[];

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
  })
  hourlyRate: number; // Cost per hour for budget calculation

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 100,
  })
  availability: number; // Percentage of time available (0-100)

  @Column({
    type: DataType.ENUM('Active', 'Inactive'),
    allowNull: false,
    defaultValue: 'Active',
  })
  status: string;

  @BelongsTo(() => Project)
  project: Project;
}
