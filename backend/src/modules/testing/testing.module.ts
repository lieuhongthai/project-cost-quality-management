import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { TestingService } from './testing.service';
import { testingProviders } from './testing.providers';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TestingController],
  providers: [TestingService, ...testingProviders],
  exports: [TestingService],
})
export class TestingModule {}
