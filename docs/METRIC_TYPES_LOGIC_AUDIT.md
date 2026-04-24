# Metric Types Logic Audit

## Scope
This document summarizes all source-code logic related to **Metric Types**, including:
- Data models and default templates.
- CRUD + protection rules for metric types/categories.
- Metric value entry and persistence.
- Aggregation/reporting APIs and UI rendering rules.
- Related project duplication behavior.

## Data Model & Default Templates
- `MetricType` model (`metric_types`) contains: `projectId`, `name`, `description`, `displayOrder`, `isActive`.
- `MetricCategory` model (`metric_categories`) belongs to `MetricType`, includes `name`, `description`, `displayOrder`, `isActive`.
- `TaskMemberMetric` model (`task_member_metrics`) links member-task assignment (`stepScreenFunctionMemberId`) with a metric category (`metricCategoryId`) and stores numeric `value` + optional `note`.
- `DEFAULT_METRIC_TYPES` and `DEFAULT_METRIC_CATEGORIES` define bootstrap templates for:
  - Requirement
  - Coding
  - Functional Design
  - Review_TestPlant
  - Review_Testcase
  - Test Cases
- Default "Test Cases" categories are fixed at: **Total / Passed / Failed**.

## API Surface (Task Workflow Controller)
### Metric Type endpoints
- `GET /task-workflow/metric-types/project/:projectId`
- `GET /task-workflow/metric-types/:id`
- `POST /task-workflow/metric-types`
- `PUT /task-workflow/metric-types/:id`
- `DELETE /task-workflow/metric-types/:id`
- `POST /task-workflow/metric-types/initialize`

### Metric Category endpoints
- `GET /task-workflow/metric-categories/type/:metricTypeId`
- `GET /task-workflow/metric-categories/:id`
- `POST /task-workflow/metric-categories`
- `PUT /task-workflow/metric-categories/:id`
- `DELETE /task-workflow/metric-categories/:id`

### Reporting endpoints (metric-type related)
- `GET /task-workflow/metrics/project/:projectId`
- `GET /task-workflow/metrics/project/:projectId/type-summary`

## Service Logic (TaskWorkflowService)
### 1) Fetching and ordering
- `findAllMetricTypes(projectId)`:
  - Filters by `projectId`.
  - Sorts by `displayOrder ASC`, then `id ASC`.
  - Includes child categories.
- `findAllMetricCategories(metricTypeId)`:
  - Filters by `metricTypeId`.
  - Sorts by `displayOrder ASC`, then `id ASC`.

### 2) Create/update/delete behavior
- `createMetricType` and `createMetricCategory`:
  - Auto-assign `displayOrder = max(existing) + 1` if not provided.
- `updateMetricType` / `updateMetricCategory`:
  - Load by id, then `update(dto)` directly.
- `deleteMetricType` protection:
  - Refuses deletion when type name normalized to lowercase equals `test cases`.
- `deleteMetricCategory` protection:
  - For metric type `test cases`, category names `total`, `passed`, `failed` are protected and cannot be deleted.

### 3) Initialization defaults
- `initializeProjectMetrics(projectId)`:
  - If metric types already exist, returns existing data and stops.
  - Otherwise creates all default metric types and categories.
  - Re-queries with categories included before returning.

### 4) Member metric persistence
- `bulkUpsertTaskMemberMetrics`:
  - Input grouped by one `stepScreenFunctionMemberId` and category-value list.
  - For each category:
    - update existing record if found.
    - else create new record.
  - Normalizes missing numeric values to `0`.

### 5) Aggregated insight API (`getProjectMetricInsights`)
- Traverses graph: active stages → active steps → step-screen-functions → assigned members → task member metrics.
- Uses metric type/category names to derive:
  - `totalTestCases`: only `Test Cases` + category `Total`.
  - `bugCount`: only `Test Cases` + category `Failed`.
- Returns project + stage + stepScreenFunction metrics:
  - `totalTestCases`, `bugCount`, `bugRate`, `testCasesPerMinute`, `actualMinutes`.

### 6) Metric Types Report API (`getProjectMetricTypeSummary`)
- Loads active metric types + active categories.
- Builds hierarchical response:
  - `metricTypes[]`: id, name, categories[]
  - `stages[] -> steps[] -> screenFunctions[] -> metrics[]`
- Aggregation unit:
  - sums metric `value` by `metricCategoryId` at each `stepScreenFunction` level across all assigned members.

## Additional Metrics Module logic (MetricsService)
- `getTestingDataForStages(stageIds)` independently aggregates testing data from `TaskMemberMetric`.
- Restricts to metric type name exactly `test cases` (case-insensitive).
- Only category names `total`, `passed`, `failed` contribute to outputs.
- Used by stage/project metrics calculations to derive `defectRate = failed / total`.

## Frontend Logic
### 1) API bindings and types
- `taskWorkflowApi` exposes metric-type/category CRUD, initialize endpoint, type-summary endpoint, and member metric upsert endpoint.
- Type system defines:
  - `MetricType`, `MetricCategory`, `TaskMemberMetric`.
  - `ProjectMetricTypeSummary` shape consumed by report UI.

### 2) Metric Configuration UI (Settings tab)
- `MetricConfigPanel`:
  - Fetches metric types by project.
  - Supports initialize defaults when empty.
  - Supports add/edit/delete metric type/category.
  - UI-level protection mirrors backend rules for:
    - `Test Cases` type deletion.
    - `Total/Passed/Failed` category deletion under `Test Cases`.
  - Collapsible list with category count chips.

### 3) Metric entry UI per assigned member
- `StepScreenFunctionEditModal`:
  - Fetches project metric types once.
  - For each member record, loads existing metrics on expand.
  - Auto-enables metric types that already have positive values.
  - Allows user to add/remove enabled metric types per member locally.
  - Saves via bulk-upsert per member when updating that member.
  - Entry field is numeric per category (non-negative input hints).

### 4) Metric Types Report page
- `ProjectMetricSummaryTab`:
  - Pulls `projectMetricTypeSummary` data.
  - Supports `Dashboard` vs `Details` mode.
  - Supports stage filter + search + "only rows with metrics" filter in details mode.
  - For non-`Test Cases`, shows extra summed "Total" row in UI; for `Test Cases` this extra total is omitted.

- `MetricsDashboard`:
  - Overview: aggregates per metric type and computes `avgPerScreen`.
  - Status rules:
    - For test-like metric types, infer pass-rate from category names containing `total` and `passed`.
    - For others: `totalValue == 0 => good`, `avgPerScreen <= 2 => warning`, else at-risk.
  - Heatmap / top issues / distribution views share one issue-count rule:
    - categories whose names include `total` or `passed` are excluded from issue count.

## Cross-feature behavior: Project Duplication
- If user duplicates project with `copyMetrics = true`:
  - clones metric types and categories from source project.
- If `copyMetrics = false`:
  - auto-runs default metric initialization for new project.

## Important implementation notes
- Protection checks are name-based (`trim().toLowerCase()`) rather than ID-based.
- Some business semantics (issue counting, pass-rate extraction) are inferred from **category names** (`total`, `passed`, `failed`) and not from category IDs.
- Metric report output is strongly tied to task-workflow hierarchy and member assignments.
