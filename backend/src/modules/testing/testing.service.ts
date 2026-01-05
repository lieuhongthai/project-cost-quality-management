import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Testing } from './testing.model';
import { CreateTestingDto, UpdateTestingDto } from './testing.dto';

@Injectable()
export class TestingService {
  constructor(
    @Inject('TESTING_REPOSITORY')
    private testingRepository: typeof Testing,
  ) {}

  private calculateMetrics(testing: Partial<Testing>): Partial<Testing> {
    const totalTestCases = testing.totalTestCases || 0;
    const passedTestCases = testing.passedTestCases || 0;
    const failedTestCases = testing.failedTestCases || 0;
    const defectsDetected = testing.defectsDetected || 0;

    // Calculate pass rate
    const passRate = totalTestCases > 0 
      ? (passedTestCases / totalTestCases) * 100 
      : 0;

    // Calculate defect rate (defects per test case)
    const defectRate = totalTestCases > 0 
      ? defectsDetected / totalTestCases 
      : 0;

    // Determine status based on pass rate
    let status: string;
    if (passRate >= 95) {
      status = 'Good';
    } else if (passRate >= 80) {
      status = 'Acceptable';
    } else {
      status = 'Poor';
    }

    return {
      ...testing,
      passRate,
      defectRate,
      status,
    };
  }

  async findAll(): Promise<Testing[]> {
    return this.testingRepository.findAll();
  }

  async findByPhase(phaseId: number): Promise<Testing[]> {
    return this.testingRepository.findAll({
      where: { phaseId },
      order: [['year', 'ASC'], ['weekNumber', 'ASC']],
    });
  }

  async findOne(id: number): Promise<Testing> {
    const testing = await this.testingRepository.findByPk(id);

    if (!testing) {
      throw new NotFoundException(`Testing record with ID ${id} not found`);
    }

    return testing;
  }

  async create(createTestingDto: CreateTestingDto): Promise<Testing> {
    const dataWithMetrics = this.calculateMetrics(createTestingDto);
    return this.testingRepository.create(dataWithMetrics as any);
  }

  async update(id: number, updateTestingDto: UpdateTestingDto): Promise<Testing> {
    const testing = await this.findOne(id);
    const dataWithMetrics = this.calculateMetrics({
      ...testing.toJSON(),
      ...updateTestingDto,
    });
    await testing.update(dataWithMetrics);
    return testing;
  }

  async remove(id: number): Promise<void> {
    const testing = await this.findOne(id);
    await testing.destroy();
  }

  async getPhaseTestingSummary(phaseId: number) {
    const testings = await this.findByPhase(phaseId);
    
    const totalTestCases = testings.reduce((sum, t) => sum + t.totalTestCases, 0);
    const totalPassed = testings.reduce((sum, t) => sum + t.passedTestCases, 0);
    const totalFailed = testings.reduce((sum, t) => sum + t.failedTestCases, 0);
    const totalDefects = testings.reduce((sum, t) => sum + t.defectsDetected, 0);
    const totalTestingTime = testings.reduce((sum, t) => sum + t.testingTime, 0);

    const overallPassRate = totalTestCases > 0 
      ? (totalPassed / totalTestCases) * 100 
      : 0;

    const overallDefectRate = totalTestCases > 0 
      ? totalDefects / totalTestCases 
      : 0;

    const avgTimePerTestCase = totalTestCases > 0 
      ? totalTestingTime / totalTestCases 
      : 0;

    const testCasesPerHour = totalTestingTime > 0 
      ? totalTestCases / totalTestingTime 
      : 0;

    return {
      totalTestCases,
      totalPassed,
      totalFailed,
      totalDefects,
      totalTestingTime,
      overallPassRate,
      overallDefectRate,
      avgTimePerTestCase,
      testCasesPerHour,
    };
  }
}
