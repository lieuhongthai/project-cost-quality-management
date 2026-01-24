import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { iamProviders } from './iam.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [IamController],
  providers: [IamService, EmailService, EmailQueueService, ...iamProviders],
  exports: [IamService],
})
export class IamModule {}
