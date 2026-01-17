import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ProjectModule } from './modules/project/project.module';
import { PhaseModule } from './modules/phase/phase.module';
import { EffortModule } from './modules/effort/effort.module';
import { TestingModule } from './modules/testing/testing.module';
import { ReportModule } from './modules/report/report.module';
import { CommentaryModule } from './modules/commentary/commentary.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ScreenFunctionModule } from './modules/screen-function/screen-function.module';
import { MemberModule } from './modules/member/member.module';
import { HolidaysModule } from './modules/holidays/holidays.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ProjectModule,
    PhaseModule,
    EffortModule,
    TestingModule,
    ReportModule,
    CommentaryModule,
    MetricsModule,
    ScreenFunctionModule,
    MemberModule,
    HolidaysModule,
  ],
})
export class AppModule {}
