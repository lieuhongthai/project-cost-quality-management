import { Injectable, NotFoundException, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { Review } from './review.model';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';
import { PhaseService } from '../phase/phase.service';
import { PhaseScreenFunctionService } from '../screen-function/phase-screen-function.service';
import { PhaseScreenFunction } from '../screen-function/phase-screen-function.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { Member } from '../member/member.model';

@Injectable()
export class ReviewService {
  constructor(
    @Inject('REVIEW_REPOSITORY')
    private reviewRepository: typeof Review,
    private phaseService: PhaseService,
    @Inject(forwardRef(() => PhaseScreenFunctionService))
    private phaseScreenFunctionService: PhaseScreenFunctionService,
  ) {}

  private async ensurePhaseLink(phaseId: number, phaseScreenFunctionId: number) {
    const phaseScreenFunction = await this.phaseScreenFunctionService.findOne(phaseScreenFunctionId);
    if (phaseScreenFunction.phaseId !== phaseId) {
      throw new BadRequestException('Screen/Function does not belong to this phase');
    }
  }

  async findAll(): Promise<Review[]> {
    return this.reviewRepository.findAll({
      include: [
        { model: PhaseScreenFunction, as: 'phaseScreenFunction', include: [{ model: ScreenFunction, as: 'screenFunction' }] },
        { model: Member, as: 'reviewer' },
      ],
    });
  }

  async findByPhase(phaseId: number): Promise<Review[]> {
    return this.reviewRepository.findAll({
      where: { phaseId },
      include: [
        { model: PhaseScreenFunction, as: 'phaseScreenFunction', include: [{ model: ScreenFunction, as: 'screenFunction' }] },
        { model: Member, as: 'reviewer' },
      ],
      order: [['reviewDate', 'ASC'], ['reviewRound', 'ASC']],
    });
  }

  async findByPhaseScreenFunction(phaseScreenFunctionId: number): Promise<Review[]> {
    return this.reviewRepository.findAll({
      where: { phaseScreenFunctionId },
      include: [
        { model: PhaseScreenFunction, as: 'phaseScreenFunction', include: [{ model: ScreenFunction, as: 'screenFunction' }] },
        { model: Member, as: 'reviewer' },
      ],
      order: [['reviewDate', 'ASC'], ['reviewRound', 'ASC']],
    });
  }

  async findOne(id: number): Promise<Review> {
    const review = await this.reviewRepository.findByPk(id, {
      include: [
        { model: PhaseScreenFunction, as: 'phaseScreenFunction', include: [{ model: ScreenFunction, as: 'screenFunction' }] },
        { model: Member, as: 'reviewer' },
      ],
    });

    if (!review) {
      throw new NotFoundException(`Review record with ID ${id} not found`);
    }

    return review;
  }

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    await this.phaseService.findOne(createReviewDto.phaseId);
    await this.ensurePhaseLink(createReviewDto.phaseId, createReviewDto.phaseScreenFunctionId);
    return this.reviewRepository.create(createReviewDto as any);
  }

  async update(id: number, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.findOne(id);
    await review.update(updateReviewDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const review = await this.findOne(id);
    await review.destroy();
  }

  async getPhaseReviewSummary(phaseId: number) {
    await this.phaseService.findOne(phaseId);
    const reviews = await this.findByPhase(phaseId);

    const totalReviewEffort = reviews.reduce((sum, r) => sum + (r.reviewEffort || 0), 0);
    const totalReviewRounds = reviews.length;
    const totalDefects = reviews.reduce((sum, r) => sum + (r.defectsFound || 0), 0);

    const roundsByItem = new Map<number, number>();
    for (const review of reviews) {
      const current = roundsByItem.get(review.phaseScreenFunctionId) || 0;
      roundsByItem.set(review.phaseScreenFunctionId, current + 1);
    }

    const reviewedItems = roundsByItem.size;
    const averageReviewRounds = reviewedItems > 0 ? totalReviewRounds / reviewedItems : 0;
    const firstTimePassCount = Array.from(roundsByItem.values()).filter(rounds => rounds === 1).length;
    const firstTimePassRate = reviewedItems > 0 ? (firstTimePassCount / reviewedItems) * 100 : 0;

    const phase = await this.phaseService.findOne(phaseId);
    const developmentEffort = phase.actualEffort || 0;
    const effortBase = phase.actualEffort || phase.estimatedEffort || 0;

    const reviewEffortRatio = developmentEffort > 0 ? totalReviewEffort / developmentEffort : 0;
    const issueDensity = effortBase > 0 ? totalDefects / effortBase : 0;

    return {
      totalReviewEffort,
      totalReviewRounds,
      totalDefects,
      reviewedItems,
      averageReviewRounds,
      firstTimePassRate,
      reviewEffortRatio,
      issueDensity,
    };
  }
}
