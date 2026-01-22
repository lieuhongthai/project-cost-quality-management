import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Phase } from '../phase/phase.model';
import { PhaseScreenFunction } from '../screen-function/phase-screen-function.model';
import { Member } from '../member/member.model';

@Table({
  tableName: 'reviews',
  timestamps: true,
})
export class Review extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Phase)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  phaseId: number;

  @ForeignKey(() => PhaseScreenFunction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  phaseScreenFunctionId: number;

  @ForeignKey(() => Member)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  reviewerId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  reviewRound: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
  })
  reviewEffort: number; // hours

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  defectsFound: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  reviewDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note: string;

  @BelongsTo(() => Phase)
  phase: Phase;

  @BelongsTo(() => PhaseScreenFunction)
  phaseScreenFunction: PhaseScreenFunction;

  @BelongsTo(() => Member, 'reviewerId')
  reviewer: Member;
}
