/**
 * Evaluation Thresholds for Project Status Assessment
 *
 * SIMPLIFIED STATUS LOGIC (v2):
 * Status is primarily based on Efficiency (CPI)
 *
 * Efficiency = Expected Effort / Actual Effort
 * Where: Expected Effort = Estimated Effort × (Progress / 100)
 *
 * Status Rules:
 * - GOOD: Efficiency ≥ 100% (actual ≤ expected)
 * - WARNING: Efficiency 83-100% (slightly over)
 * - AT RISK: Efficiency < 83% (more than 20% over)
 */

export const EVALUATION_THRESHOLDS = {
  /**
   * Project and Phase Status Thresholds
   * Status: Good | Warning | At Risk
   *
   * Simplified to focus on Efficiency (CPI) - Are we using resources effectively?
   */
  project: {
    /**
     * GOOD Status Criteria:
     * - Actual effort ≤ Expected effort (Efficiency ≥ 100%)
     */
    good: {
      spi: { min: 0.95 },           // Kept for compatibility
      cpi: { min: 1.0 },            // CPI ≥ 1.0 means actual ≤ expected (efficient)
      delayRate: { max: 5 },        // Kept for compatibility
    },

    /**
     * WARNING Status Criteria:
     * - Actual effort slightly over expected (Efficiency 83-100%)
     */
    warning: {
      spi: { min: 0.80, max: 0.95 },    // Kept for compatibility
      cpi: { min: 0.83, max: 1.0 },     // CPI 0.83-1.0 = 0-20% over budget
      delayRate: { min: 5, max: 20 },   // Kept for compatibility
    },

    /**
     * AT RISK Status Criteria:
     * - Actual effort significantly over expected (Efficiency < 83%)
     */
    atRisk: {
      spi: { max: 0.80 },           // Kept for compatibility
      cpi: { max: 0.83 },           // CPI < 0.83 = more than 20% over budget
      delayRate: { min: 20 },       // Kept for compatibility
    },
  },

  /**
   * Weights for Combined Status Evaluation
   * Used when multiple metrics conflict
   */
  weights: {
    schedule: 0.35,    // 35% weight on schedule metrics (SPI)
    cost: 0.35,        // 35% weight on cost metrics (CPI)
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
