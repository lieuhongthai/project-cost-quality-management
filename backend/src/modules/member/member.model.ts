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
import { User } from '../iam/user.model';

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
  ON_LEAVE = 'On Leave',
}

export enum MemberAvailability {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRACT = 'Contract',
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
    type: DataType.ENUM('Full-time', 'Part-time', 'Contract'),
    allowNull: false,
    defaultValue: 'Full-time',
  })
  availability: string;

  @Column({
    type: DataType.ENUM('Active', 'Inactive', 'On Leave'),
    allowNull: false,
    defaultValue: 'Active',
  })
  status: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  userId: number;

  @BelongsTo(() => Project)
  project: Project;

  @BelongsTo(() => User)
  user: User;
}
