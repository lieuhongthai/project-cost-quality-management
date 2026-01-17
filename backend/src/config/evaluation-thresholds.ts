/**
 * Evaluation Thresholds for Project Status Assessment
 *
 * SIMPLIFIED STATUS LOGIC (v2):
 * Status is primarily based on Efficiency (CPI) and Quality (Pass Rate)
 *
 * Efficiency = Expected Effort / Actual Effort
 * Where: Expected Effort = Estimated Effort × (Progress / 100)
 *
 * Status Rules:
 * - GOOD: Efficiency ≥ 100% (actual ≤ expected) AND Pass Rate ≥ 95%
 * - WARNING: Efficiency 83-100% (slightly over) OR Pass Rate 80-95%
 * - AT RISK: Efficiency < 83% (more than 20% over) OR Pass Rate < 80%
 */

export const EVALUATION_THRESHOLDS = {
  /**
   * Project and Phase Status Thresholds
   * Status: Good | Warning | At Risk
   *
   * Simplified to focus on two key metrics:
   * 1. Efficiency (CPI) - Are we using resources effectively?
   * 2. Quality (Pass Rate) - Is the output quality acceptable?
   */
  project: {
    /**
     * GOOD Status Criteria:
     * - Actual effort ≤ Expected effort (Efficiency ≥ 100%)
     * - Quality is excellent (Pass Rate ≥ 95%)
     */
    good: {
      spi: { min: 0.95 },           // Kept for compatibility
      cpi: { min: 1.0 },            // CPI ≥ 1.0 means actual ≤ expected (efficient)
      delayRate: { max: 5 },        // Kept for compatibility
      passRate: { min: 95 },        // Pass Rate ≥ 95% (excellent quality)
    },

    /**
     * WARNING Status Criteria:
     * - Actual effort slightly over expected (Efficiency 83-100%)
     * - Quality is acceptable but needs attention (Pass Rate 80-95%)
     */
    warning: {
      spi: { min: 0.80, max: 0.95 },    // Kept for compatibility
      cpi: { min: 0.83, max: 1.0 },     // CPI 0.83-1.0 = 0-20% over budget
      delayRate: { min: 5, max: 20 },   // Kept for compatibility
      passRate: { min: 80, max: 95 },   // Pass Rate between 80-95%
    },

    /**
     * AT RISK Status Criteria:
     * - Actual effort significantly over expected (Efficiency < 83%)
     * - Quality is poor (Pass Rate < 80%)
     */
    atRisk: {
      spi: { max: 0.80 },           // Kept for compatibility
      cpi: { max: 0.83 },           // CPI < 0.83 = more than 20% over budget
      delayRate: { min: 20 },       // Kept for compatibility
      passRate: { max: 80 },        // Pass Rate < 80%
    },
  },

  /**
   * Testing Status Thresholds
   * Status: Good | Acceptable | Poor
   */
  testing: {
    /**
     * GOOD Status: Pass Rate ≥ 95%
     * Industry standard for high-quality software
     */
    good: {
      passRate: { min: 95 },
      defectRate: { max: 0.05 },    // ≤ 0.05 defects per test case
    },

    /**
     * ACCEPTABLE Status: Pass Rate between 80-95%
     * Acceptable for most commercial software
     */
    acceptable: {
      passRate: { min: 80, max: 95 },
      defectRate: { min: 0.05, max: 0.2 },
    },

    /**
     * POOR Status: Pass Rate < 80%
     * Requires immediate attention and rework
     */
    poor: {
      passRate: { max: 80 },
      defectRate: { min: 0.2 },     // > 0.2 defects per test case
    },
  },

  /**
   * Weights for Combined Status Evaluation
   * Used when multiple metrics conflict
   */
  weights: {
    schedule: 0.35,    // 35% weight on schedule metrics (SPI)
    cost: 0.35,        // 35% weight on cost metrics (CPI)
    quality: 0.30,     // 30% weight on quality metrics (Pass Rate)
  },
};

/**
 * Status Priority Order
 * When multiple conditions apply, take the worst status
 */
export const STATUS_PRIORITY = {
  'At Risk': 3,
  'Warning': 2,
  'Good': 1,
};

/**
 * Helper function to get worst status
 */
export function getWorstStatus(...statuses: string[]): string {
  return statuses.reduce((worst, current) => {
    const worstPriority = STATUS_PRIORITY[worst] || 0;
    const currentPriority = STATUS_PRIORITY[current] || 0;
    return currentPriority > worstPriority ? current : worst;
  });
}
