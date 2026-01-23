import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { iamProviders } from './iam.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [IamController],
  providers: [IamService, ...iamProviders],
  exports: [IamService],
})
export class IamModule {}
