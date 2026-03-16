import { Card, LoadingSpinner, EmptyState, Input, Select } from "@/components/common";
import { MetricsDashboard } from "@/components/metrics";
import { useTranslation } from "react-i18next";

const metricBadgeStyles = [
  "bg-red-50 text-red-700 ring-red-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "bg-purple-50 text-purple-700 ring-purple-100",
  "bg-pink-50 text-pink-700 ring-pink-100",
  "bg-teal-50 text-teal-700 ring-teal-100",
];

interface ProjectMetricSummaryTabProps {
  projectMetricTypeSummary: any;
  metricReportView: "dashboard" | "details";
  setMetricReportView: (view: "dashboard" | "details") => void;
  metricSummaryFilter: {
    search: string;
    stageId: string;
    showOnlyWithMetrics: boolean;
  };
  setMetricSummaryFilter: (filter: any) => void;
}

export function ProjectMetricSummaryTab({
  projectMetricTypeSummary,
  metricReportView,
  setMetricReportView,
  metricSummaryFilter,
  setMetricSummaryFilter,
}: ProjectMetricSummaryTabProps) {
  const { t } = useTranslation();

  const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

  const getMetricTypeVisual = (name: string) => {
    const normalized = normalizeSearchValue(name);
    if (normalized.includes("bug")) {
      return { icon: "🐞", accent: "bg-rose-100 text-rose-700" };
    }
    if (normalized.includes("test")) {
      return { icon: "🧪", accent: "bg-emerald-100 text-emerald-700" };
    }
    if (normalized.includes("review") || normalized.includes("issue")) {
      return { icon: "🔍", accent: "bg-blue-100 text-blue-700" };
    }
    return { icon: "📊", accent: "bg-indigo-100 text-indigo-700" };
  };

  const getMetricCategoryValue = (
    metrics: Array<{ metricCategoryId: number; value: number }>,
    categoryId: number,
  ) => {
    const metric = metrics.find((item) => item.metricCategoryId === categoryId);
    return metric?.value ?? 0;
  };

  const getStageScreenFunctionCount = (stage: {
    steps: Array<{ screenFunctions: Array<unknown> }>;
  }) =>
    stage.steps.reduce((total, step) => total + step.screenFunctions.length, 0);

  const hasMetricValues = (
    metrics: Array<{ metricCategoryId: number; value: number }>,
    categoryIds: number[],
  ) =>
    metrics.some(
      (metric) =>
        categoryIds.includes(metric.metricCategoryId) &&
        (metric.value ?? 0) > 0,
    );

  const getMetricTypeCategoryTotals = (metricType: {
    categories: Array<{ id: number; name: string }>;
  }) => {
    if (!projectMetricTypeSummary) return { categoryTotals: [], grandTotal: 0 };
    const stages = metricSummaryFilter.stageId
      ? projectMetricTypeSummary.stages.filter(
          (s: any) => s.stageId === Number(metricSummaryFilter.stageId),
        )
      : projectMetricTypeSummary.stages;

    const totalsMap = new Map<number, number>();
    for (const cat of metricType.categories) {
      totalsMap.set(cat.id, 0);
    }
    for (const stage of stages) {
      for (const step of stage.steps) {
        for (const sf of step.screenFunctions) {
          for (const metric of sf.metrics) {
            if (totalsMap.has(metric.metricCategoryId)) {
              totalsMap.set(
                metric.metricCategoryId,
                (totalsMap.get(metric.metricCategoryId) ?? 0) + metric.value,
              );
            }
          }
        }
      }
    }
    const categoryTotals = metricType.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      total: totalsMap.get(cat.id) ?? 0,
    }));
    const grandTotal = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    return { categoryTotals, grandTotal };
  };

  const getFilteredMetricStages = (metricType: {
    categories: Array<{ id: number }>;
  }) => {
    if (!projectMetricTypeSummary) return [];
    const searchValue = normalizeSearchValue(metricSummaryFilter.search);
    const categoryIds = metricType.categories.map((category) => category.id);
    return projectMetricTypeSummary.stages
      .filter(
        (stage: any) =>
          !metricSummaryFilter.stageId ||
          stage.stageId === Number(metricSummaryFilter.stageId),
      )
      .map((stage: any) => {
        const steps = stage.steps
          .map((step: any) => {
            const screenFunctions = step.screenFunctions.filter(
              (screenFunction: any) => {
                const matchesSearch = searchValue
                  ? normalizeSearchValue(screenFunction.screenFunctionName).includes(searchValue) ||
                    normalizeSearchValue(step.stepName).includes(searchValue) ||
                    normalizeSearchValue(stage.stageName).includes(searchValue)
                  : true;
                const matchesMetric =
                  !metricSummaryFilter.showOnlyWithMetrics ||
                  hasMetricValues(screenFunction.metrics, categoryIds);
                return matchesSearch && matchesMetric;
              },
            );
            return { ...step, screenFunctions };
          })
          .filter((step: any) => step.screenFunctions.length > 0);
        return { ...stage, steps };
      })
      .filter((stage: any) => stage.steps.length > 0);
  };

  return (
    <div className="space-y-6">
      <Card title={t("metrics.metricTypesReport")}>
        {!projectMetricTypeSummary ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="lg" />
          </div>
        ) : projectMetricTypeSummary.metricTypes.length === 0 ? (
          <EmptyState
            title={t("metrics.noMetricTypes")}
            description={t("metrics.metricTypesReportEmpty")}
          />
        ) : (
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setMetricReportView("dashboard")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    metricReportView === "dashboard"
                      ? "bg-primary text-primary-contrast"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t("metrics.viewDashboard", "Dashboard")}
                </button>
                <button
                  onClick={() => setMetricReportView("details")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    metricReportView === "details"
                      ? "bg-primary text-primary-contrast"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t("metrics.viewDetails", "Details")}
                </button>
              </div>

              <Select
                value={metricSummaryFilter.stageId}
                onChange={(event) =>
                  setMetricSummaryFilter((prev: any) => ({
                    ...prev,
                    stageId: event.target.value,
                  }))
                }
                options={[
                  { value: "", label: t("metrics.allStages") },
                  ...projectMetricTypeSummary.stages.map((stage: any) => ({
                    value: stage.stageId,
                    label: stage.stageName,
                  })),
                ]}
                fullWidth={false}
              />
            </div>

            {/* Dashboard View */}
            {metricReportView === "dashboard" && (
              <MetricsDashboard
                projectMetricTypeSummary={projectMetricTypeSummary}
                stageFilter={metricSummaryFilter.stageId}
              />
            )}

            {/* Details View */}
            {metricReportView === "details" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr,1fr]">
                  <Input
                    placeholder={t("metrics.metricSummarySearchPlaceholder")}
                    value={metricSummaryFilter.search}
                    onChange={(event) =>
                      setMetricSummaryFilter((prev: any) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={metricSummaryFilter.showOnlyWithMetrics}
                      onChange={(event) =>
                        setMetricSummaryFilter((prev: any) => ({
                          ...prev,
                          showOnlyWithMetrics: event.target.checked,
                        }))
                      }
                    />
                    {t("metrics.onlyWithMetrics")}
                  </label>
                </div>

                {projectMetricTypeSummary.metricTypes.map(
                  (metricType: any, index: number) => {
                    const filteredStages = getFilteredMetricStages(metricType);
                    const metricVisual = getMetricTypeVisual(metricType.name);
                    const { categoryTotals, grandTotal } = getMetricTypeCategoryTotals(metricType);
                    const nonZeroCategories = categoryTotals.filter((cat) => cat.total > 0);
                    const isTestCases = metricType.name.toLowerCase() === 'test cases';
                    return (
                      <details
                        key={metricType.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                        open={index === 0}
                      >
                        <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${metricVisual.accent}`}
                            >
                              <span aria-hidden="true">{metricVisual.icon}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {metricType.name}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {t("metrics.metricTypesReportDesc")}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            {nonZeroCategories.map((category) => {
                              const originalIndex = metricType.categories.findIndex(
                                (c: any) => c.id === category.id,
                              );
                              return (
                                <div
                                  key={category.id}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <span
                                    className={`text-xs font-semibold ${metricBadgeStyles[
                                      originalIndex % metricBadgeStyles.length
                                    ]
                                      .split(" ")
                                      .filter((c: string) => c.startsWith("text-"))
                                      .join(" ")}`}
                                  >
                                    {category.name}
                                  </span>
                                  <span className="text-xs font-bold text-gray-700">
                                    {category.total.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                            {nonZeroCategories.length > 0 && !isTestCases && (
                              <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-1 mt-1">
                                <span className="text-xs font-bold text-gray-900">
                                  {t("common.total", "Total")}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                  {grandTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {nonZeroCategories.length === 0 && (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </div>
                        </summary>

                        <div className="mt-4 space-y-4">
                          {filteredStages.length === 0 ? (
                            <EmptyState
                              title={t("metrics.noMetricsForFilter")}
                              description={t("metrics.metricSummaryTryAnother")}
                            />
                          ) : (
                            filteredStages.map((stage: any) => (
                              <div
                                key={stage.stageId}
                                className="rounded-xl border border-gray-200 bg-gray-50/60 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {stage.stageName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {t("metrics.screenFunctionCount", {
                                      value: getStageScreenFunctionCount(stage),
                                    })}
                                  </div>
                                </div>

                                <div className="mt-3 space-y-4">
                                  {stage.steps.map((step: any, stepIndex: number) => (
                                    <div key={step.stepId} className="relative pl-6">
                                      <span className="absolute left-2 top-3 h-full w-px bg-gray-200" />
                                      <div className="relative">
                                        <span className="absolute -left-6 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-primary-light">
                                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        </span>
                                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800">
                                          <span>{step.stepName}</span>
                                          <span className="text-xs text-gray-500">
                                            {t("metrics.stepScreenFunctionCount", {
                                              value: step.screenFunctions.length,
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="mt-3 space-y-3 pl-4">
                                        {step.screenFunctions.map((screenFunction: any) => (
                                          <div
                                            key={screenFunction.stepScreenFunctionId}
                                            className="relative pl-6"
                                          >
                                            <span className="absolute left-2 top-4 h-full w-px bg-gray-200" />
                                            <span className="absolute -left-1 top-3 h-2 w-2 rounded-full bg-gray-300" />
                                            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                                              <div className="flex items-start justify-between gap-4">
                                                <div className="text-sm font-semibold text-gray-900">
                                                  {screenFunction.screenFunctionName}
                                                </div>
                                                <div className="flex flex-col gap-1 min-w-[180px] shrink-0">
                                                  {(() => {
                                                    const screenCategories = metricType.categories
                                                      .map((category: any, categoryIndex: number) => ({
                                                        ...category,
                                                        value: getMetricCategoryValue(
                                                          screenFunction.metrics,
                                                          category.id,
                                                        ),
                                                        originalIndex: categoryIndex,
                                                      }))
                                                      .filter((cat: any) => cat.value > 0);
                                                    const screenTotal = screenCategories.reduce(
                                                      (sum: number, cat: any) => sum + cat.value,
                                                      0,
                                                    );
                                                    return (
                                                      <>
                                                        {screenCategories.map((category: any) => (
                                                          <div
                                                            key={category.id}
                                                            className="flex items-center justify-between gap-4"
                                                          >
                                                            <span
                                                              className={`text-xs font-semibold ${metricBadgeStyles[
                                                                category.originalIndex %
                                                                  metricBadgeStyles.length
                                                              ]
                                                                .split(" ")
                                                                .filter((c: string) => c.startsWith("text-"))
                                                                .join(" ")}`}
                                                            >
                                                              {category.name}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-700">
                                                              {category.value.toLocaleString()}
                                                            </span>
                                                          </div>
                                                        ))}
                                                        {screenCategories.length > 0 && !isTestCases && (
                                                          <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-1 mt-1">
                                                            <span className="text-xs font-bold text-gray-900">
                                                              {t("common.total", "Total")}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-900">
                                                              {screenTotal.toLocaleString()}
                                                            </span>
                                                          </div>
                                                        )}
                                                        {screenCategories.length === 0 && (
                                                          <span className="text-xs text-gray-400">0</span>
                                                        )}
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {stepIndex === stage.steps.length - 1 && (
                                        <span className="absolute left-2 top-3 h-[calc(100%-0.75rem)] w-px bg-transparent" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>
                    );
                  },
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
