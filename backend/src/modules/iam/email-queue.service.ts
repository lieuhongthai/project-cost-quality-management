import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailQueue, EmailStatus } from './email-queue.model';
import { EmailService } from './email.service';
import createSubscriber, { Subscriber } from 'pg-listen';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private subscriber: Subscriber;

  constructor(
    @Inject('EMAIL_QUEUE_REPOSITORY')
    private readonly emailQueueRepository: typeof EmailQueue,
    private readonly emailService: EmailService,
    @Inject('SEQUELIZE')
    private readonly sequelize: Sequelize,
  ) {}

  async onModuleInit() {
    // Create database trigger if not exists
    await this.createNotifyTrigger();

    // Initialize pg-listen subscriber
    const connectionString = process.env.DATABASE_URL || this.getDatabaseUrl();
    this.subscriber = createSubscriber({ connectionString });

    await this.subscriber.connect();
    this.logger.log('Email queue listener connected');

    // Listen to new email notifications
    await this.subscriber.listenTo('new_email');

    this.subscriber.events.on('error', (error) => {
      this.logger.error('pg-listen error:', error);
    });

    this.subscriber.notifications.on('new_email', async (payload) => {
      this.logger.log('Received new email notification:', payload);
      await this.processEmailQueue();
    });

    // Process any pending emails on startup
    await this.processEmailQueue();
  }

  private async createNotifyTrigger(): Promise<void> {
    try {
      // Create function that notifies on insert
      await this.sequelize.query(`
        CREATE OR REPLACE FUNCTION notify_new_email()
        RETURNS TRIGGER AS $$
        BEGIN
          PERFORM pg_notify('new_email', NEW.id::text);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger on email_queue table
      await this.sequelize.query(`
        DROP TRIGGER IF EXISTS email_queue_insert_trigger ON email_queue;
        CREATE TRIGGER email_queue_insert_trigger
        AFTER INSERT ON email_queue
        FOR EACH ROW
        EXECUTE FUNCTION notify_new_email();
      `);

      this.logger.log('Email queue trigger created successfully');
    } catch (error) {
      this.logger.error('Failed to create email queue trigger:', error);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.close();
      this.logger.log('Email queue listener closed');
    }
  }

  private getDatabaseUrl(): string {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const username = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const database = process.env.DB_NAME || "project_management";
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  async addToQueue(to: string, subject: string, body: string): Promise<EmailQueue> {
    const email = await this.emailQueueRepository.create({
      to,
      subject,
      body,
      status: EmailStatus.PENDING,
      retryCount: 0,
    });

    // Note: Database trigger will automatically NOTIFY on insert
    // But we keep this as a fallback in case trigger is not set up
    try {
      await this.sequelize.query(`NOTIFY new_email, '${email.id}'`);
    } catch (error) {
      this.logger.warn('Manual NOTIFY failed (trigger should handle this):', error.message);
    }

    this.logger.log(`Email added to queue: ${email.id}`);
    return email;
  }

  async processEmailQueue(): Promise<void> {
    const pendingEmails = await this.emailQueueRepository.findAll({
      where: { status: EmailStatus.PENDING },
      order: [['createdAt', 'ASC']],
      limit: 10, // Process in batches
    });

    if (pendingEmails.length === 0) {
      return;
    }

    this.logger.log(`Processing ${pendingEmails.length} pending emails`);

    for (const email of pendingEmails) {
      try {
        await this.emailService.sendEmail(email.to, email.subject, email.body);

        email.status = EmailStatus.SENT;
        email.sentAt = new Date();
        await email.save();

        this.logger.log(`Email ${email.id} sent successfully`);
      } catch (error) {
        email.retryCount += 1;
        email.errorMessage = error.message;

        // Retry up to 3 times
        if (email.retryCount >= 3) {
          email.status = EmailStatus.FAILED;
          this.logger.error(`Email ${email.id} failed after ${email.retryCount} retries`);
        } else {
          this.logger.warn(`Email ${email.id} failed, will retry (attempt ${email.retryCount})`);
        }

        await email.save();
      }
    }
  }

  async addPasswordEmail(to: string, username: string, password: string): Promise<EmailQueue> {
    const subject = 'Your Account Password';
    const body = `
Hello,

Your account has been created with the following credentials:

Username: ${username}
Password: ${password}

For security reasons, you will be required to change your password upon your first login.

Best regards,
Project Management System
    `.trim();

    return this.addToQueue(to, subject, body);
  }
}
