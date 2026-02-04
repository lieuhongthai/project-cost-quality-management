import { Module } from '@nestjs/common';
import { ScreenFunctionController } from './screen-function.controller';
import { ScreenFunctionService } from './screen-function.service';
import { screenFunctionProviders } from './screen-function.providers';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScreenFunctionController],
  providers: [ScreenFunctionService, ...screenFunctionProviders],
  exports: [ScreenFunctionService, ...screenFunctionProviders],
})
export class ScreenFunctionModule {}
