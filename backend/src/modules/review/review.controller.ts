import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findAll() {
    return this.reviewService.findAll();
  }

  @Get('phase/:phaseId')
  findByPhase(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.reviewService.findByPhase(phaseId);
  }

  @Get('phase/:phaseId/summary')
  getPhaseSummary(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.reviewService.getPhaseReviewSummary(phaseId);
  }

  @Get('phase-screen-function/:phaseScreenFunctionId')
  findByPhaseScreenFunction(
    @Param('phaseScreenFunctionId', ParseIntPipe) phaseScreenFunctionId: number,
  ) {
    return this.reviewService.findByPhaseScreenFunction(phaseScreenFunctionId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewService.findOne(id);
  }

  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(createReviewDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewService.remove(id);
  }
}
