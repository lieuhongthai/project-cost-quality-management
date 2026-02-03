import { Module } from '@nestjs/common';
import { EffortController } from './effort.controller';
import { EffortService } from './effort.service';
import { effortProviders } from './effort.providers';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EffortController],
  providers: [EffortService, ...effortProviders],
  exports: [EffortService],
})
export class EffortModule {}
