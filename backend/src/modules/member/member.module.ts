import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { memberProviders } from './member.providers';
import { DatabaseModule } from '../../database/database.module';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [
    DatabaseModule,
    IamModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [MemberController],
  providers: [MemberService, ...memberProviders],
  exports: [MemberService],
})
export class MemberModule {}
