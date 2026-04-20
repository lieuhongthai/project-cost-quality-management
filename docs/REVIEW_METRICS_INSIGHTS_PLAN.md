# Review Metrics Insights Plan

## Goal
Turn review metrics into insights that are actionable for PM/QA/Tech Lead:
- detect quality hotspots early,
- estimate delivery risk,
- evaluate review effectiveness,
- improve process over time.

## Data Available Today
Current project already captures:
- metric values by `MetricType` / `MetricCategory`,
- hierarchy Stage -> Step -> Screen/Function,
- effort-related context (`actualEffort`, worklog-derived signals),
- `Test Cases` metrics (`Total`, `Passed`, `Failed`).

## Recommended Insight Groups

### 1) Quality Heat & Hotspots
1. **Issue Density per Screen**
   - Formula: `sum(all review issue categories) / 1 screen`
   - Use case: find screens with concentrated review debt.
2. **Issue Density per Effort Hour**
   - Formula: `sum(review issues) / actualEffortHours`
   - Use case: normalize by workload, identify unstable areas.
3. **Top Recurring Categories**
   - Rank categories by total count over period/stage.
   - Use case: discover systemic weaknesses (e.g. ambiguous requirement, logic unclear).

### 2) Process Effectiveness
4. **Review Effectiveness Index (REI)**
   - Formula: `review defects caught before test / total defects`
   - Approximation now: compare review metric totals vs failed test case trends.
5. **Reopen / Rework Pressure (proxy)**
   - Formula: `high-severity review categories + failed test spikes`
   - Use case: detect weak handoff or requirement understanding.
6. **Shift-left Score**
   - Formula: `% defects found in Requirement/Design stages`
   - Use case: measure whether team catches issues earlier.

### 3) Delivery Risk & Forecasting
7. **Risk Score per Stage**
   - Weighted formula example:
     - Requirement issues * 1.2
     - Design issues * 1.1
     - Coding issues * 1.0
     - Failed test cases * 1.5
   - Use case: produce a single risk score for steering meetings.
8. **ETA Risk Trend**
   - Combine risk score trajectory + actual effort trend.
   - Use case: warn when stage likely to slip.

### 4) Team/Execution Insights
9. **Review Throughput**
   - Formula: `issues logged / reviewer-hour`
   - Use case: compare cadence between periods.
10. **Review-to-Fix Cycle Proxy**
   - Formula: `new review issues vs cleared failed tests over time`
   - Use case: infer whether fixes keep pace with incoming findings.

## Suggested First Dashboard (MVP)
Build 4 cards + 3 charts first:

### KPI Cards
- Total review issues (current sprint/stage)
- Failed test ratio (`Failed / Total`)
- Shift-left score
- Stage risk score (weighted)

### Charts
- **Stacked bar**: issues by stage and metric type
- **Trend line**: issues + failed tests over time
- **Pareto chart**: top categories causing 80% problems

## Drill-down UX
- Click Stage -> see Step distribution
- Click Step -> see Screen/Function + categories
- For each row show:
  - category counts,
  - relative percentage,
  - effort-normalized score,
  - status (Good/Warning/At Risk)

## Alert Rules (Practical)
- Alert A: category count grows >30% week-over-week
- Alert B: failed test ratio >15%
- Alert C: stage risk score above threshold for 2 consecutive periods

## Implementation Phasing

### Phase 1 (fastest value)
- Use existing summary API to compute:
  - issue density,
  - top categories,
  - shift-left score,
  - basic risk score.

### Phase 2
- Add trend snapshots by day/week for time-series insight.

### Phase 3
- Add recommendation engine:
  - suggest actions by dominant category,
  - auto-generate project commentary.

## Notes
- Keep formulas configurable per project (weights/thresholds).
- Always show both **absolute count** and **normalized metric** (per screen/per hour).
- Prefer trend and comparison (WoW/Stage-to-Stage) over single-point totals.
