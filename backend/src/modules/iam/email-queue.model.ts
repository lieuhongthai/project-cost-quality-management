import { Column, DataType, Model, Table } from 'sequelize-typescript';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Table({
  tableName: 'email_queue',
  timestamps: true,
})
export class EmailQueue extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  to: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  body: string;

  @Column({
    type: DataType.ENUM(...Object.values(EmailStatus)),
    allowNull: false,
    defaultValue: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  errorMessage: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sentAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  retryCount: number;
}
