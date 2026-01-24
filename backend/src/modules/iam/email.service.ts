import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';

    if (this.isProduction) {
      // Production: Use real SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else {
      // Development: Use ethereal email (test account)
      this.logger.log('Running in development mode - emails will be logged only');
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.isProduction) {
      // Development: Just log the email
      this.logger.log('=== EMAIL (Development Mode - Not Sent) ===');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body:\n${body}`);
      this.logger.log('==========================================');
      return;
    }

    // Production: Actually send the email
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Project Management System" <noreply@example.com>',
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendPasswordEmail(to: string, username: string, password: string): Promise<void> {
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

    await this.sendEmail(to, subject, body);
  }
}
