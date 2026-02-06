import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { memberProviders } from './member.providers';
import { DatabaseModule } from '../../database/database.module';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [DatabaseModule, IamModule],
  controllers: [MemberController],
  providers: [MemberService, ...memberProviders],
  exports: [MemberService],
})
export class MemberModule {}
