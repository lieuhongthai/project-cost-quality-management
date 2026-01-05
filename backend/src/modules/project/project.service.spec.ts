import { ProjectService } from './project.service';

describe('ProjectService - Status Evaluation', () => {
  let service: ProjectService;

  beforeEach(() => {
    // Create service instance with mock repositories
    service = new ProjectService(null, null);
  });

  describe('evaluateProjectStatus', () => {
    it('should return "Good" when all metrics are excellent', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 1.0,
        delayRate: 0,
        passRate: 98,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('Good');
    });

    it('should return "At Risk" when SPI is very low', () => {
      const metrics = {
        schedulePerformanceIndex: 0.7, // < 0.8
        costPerformanceIndex: 1.0,
        delayRate: 5,
        passRate: 95,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('At Risk');
    });

    it('should return "At Risk" when CPI is very low', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 0.75, // < 0.8
        delayRate: 5,
        passRate: 95,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('At Risk');
    });

    it('should return "At Risk" when delay rate is high', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 1.0,
        delayRate: 25, // > 20%
        passRate: 95,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('At Risk');
    });

    it('should return "At Risk" when pass rate is low', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 1.0,
        delayRate: 5,
        passRate: 75, // < 80%
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('At Risk');
    });

    it('should return "Warning" when SPI is moderately low', () => {
      const metrics = {
        schedulePerformanceIndex: 0.85, // 0.8-0.95
        costPerformanceIndex: 1.0,
        delayRate: 5,
        passRate: 95,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('Warning');
    });

    it('should return "Warning" when pass rate is acceptable but not great', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 1.0,
        delayRate: 5,
        passRate: 85, // 80-95
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('Warning');
    });

    it('should return "Warning" when delay rate is moderate', () => {
      const metrics = {
        schedulePerformanceIndex: 1.0,
        costPerformanceIndex: 1.0,
        delayRate: 15, // 5-20%
        passRate: 95,
      };

      const status = service.evaluateProjectStatus(metrics);
      expect(status).toBe('Warning');
    });
  });
});
