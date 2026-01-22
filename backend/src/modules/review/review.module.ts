import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { reviewProviders } from './review.providers';
import { PhaseModule } from '../phase/phase.module';
import { ScreenFunctionModule } from '../screen-function/screen-function.module';

@Module({
  imports: [DatabaseModule, PhaseModule, forwardRef(() => ScreenFunctionModule)],
  controllers: [ReviewController],
  providers: [ReviewService, ...reviewProviders],
  exports: [ReviewService],
})
export class ReviewModule {}
