/**
 * Evaluation Thresholds for Project Status Assessment
 *
 * These thresholds are based on industry best practices and PMI standards:
 * - SPI/CPI: Standard Earned Value Management metrics
 * - Pass Rate: IEEE software testing standards
 * - Delay Rate: Project management tolerance levels
 */

export const EVALUATION_THRESHOLDS = {
  /**
   * Project and Phase Status Thresholds
   * Status: Good | Warning | At Risk
   */
  project: {
    /**
     * GOOD Status Criteria:
     * - Project is on track or ahead of schedule
     * - Costs are within budget
     * - Quality metrics are excellent
     */
    good: {
      spi: { min: 0.95 },           // Schedule Performance Index ≥ 0.95 (within 5% of plan)
      cpi: { min: 0.95 },           // Cost Performance Index ≥ 0.95 (within 5% of budget)
      delayRate: { max: 5 },        // Delay Rate ≤ 5% (acceptable variance)
      passRate: { min: 95 },        // Pass Rate ≥ 95% (excellent quality)
    },

    /**
     * WARNING Status Criteria:
     * - Minor schedule or cost deviations
     * - Quality metrics are acceptable but need attention
     * - Requires monitoring and corrective actions
     */
    warning: {
      spi: { min: 0.80, max: 0.95 },    // SPI between 0.80-0.95 (5-20% behind schedule)
      cpi: { min: 0.80, max: 0.95 },    // CPI between 0.80-0.95 (5-20% over budget)
      delayRate: { min: 5, max: 20 },   // Delay Rate between 5-20%
      passRate: { min: 80, max: 95 },   // Pass Rate between 80-95%
    },

    /**
     * AT RISK Status Criteria:
     * - Significant schedule or cost overruns
     * - Poor quality metrics
     * - Requires immediate intervention
     */
    atRisk: {
      spi: { max: 0.80 },           // SPI < 0.80 (more than 20% behind schedule)
      cpi: { max: 0.80 },           // CPI < 0.80 (more than 20% over budget)
      delayRate: { min: 20 },       // Delay Rate > 20%
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
