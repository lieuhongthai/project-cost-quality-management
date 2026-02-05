import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectMetricTypeSummary } from '@/types';

interface MetricsDashboardProps {
  projectMetricTypeSummary: ProjectMetricTypeSummary;
  stageFilter?: string;
}

// Aggregate metrics data from the summary
interface AggregatedMetrics {
  metricTypeId: number;
  metricTypeName: string;
  categories: Array<{
    id: number;
    name: string;
    total: number;
  }>;
  totalValue: number;
  screenCount: number;
  avgPerScreen: number;
}

interface ScreenMetricData {
  screenFunctionId: number;
  screenFunctionName: string;
  stepName: string;
  stageName: string;
  stageId: number;
  metrics: Record<number, number>; // categoryId -> value
  totalIssues: number;
}

interface StageHeatMapData {
  stageId: number;
  stageName: string;
  screens: Array<{
    screenFunctionId: number;
    screenFunctionName: string;
    status: 'good' | 'warning' | 'critical';
    totalIssues: number;
  }>;
}

// Color schemes for metric types
const METRIC_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string; accent: string }> = {
  review: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🔍', accent: 'border-blue-200' },
  bug: { bg: 'bg-rose-50', text: 'text-rose-700', icon: '🐞', accent: 'border-rose-200' },
  test: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🧪', accent: 'border-emerald-200' },
  default: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: '📊', accent: 'border-indigo-200' },
};

const BAR_COLORS = [
  'bg-red-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
];

function getMetricTypeColor(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('review') || normalized.includes('issue')) return METRIC_TYPE_COLORS.review;
  if (normalized.includes('bug')) return METRIC_TYPE_COLORS.bug;
  if (normalized.includes('test')) return METRIC_TYPE_COLORS.test;
  return METRIC_TYPE_COLORS.default;
}

export function MetricsDashboard({ projectMetricTypeSummary, stageFilter }: MetricsDashboardProps) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'overview' | 'heatmap' | 'issues' | 'distribution'>('overview');

  // Aggregate metrics by type
  const aggregatedMetrics = useMemo((): AggregatedMetrics[] => {
    const result: AggregatedMetrics[] = [];

    for (const metricType of projectMetricTypeSummary.metricTypes) {
      const categoryTotals = new Map<number, { name: string; total: number }>();

      // Initialize categories
      for (const cat of metricType.categories) {
        categoryTotals.set(cat.id, { name: cat.name, total: 0 });
      }

      let screenCount = 0;

      // Filter stages if needed
      const stages = stageFilter
        ? projectMetricTypeSummary.stages.filter(s => s.stageId === Number(stageFilter))
        : projectMetricTypeSummary.stages;

      for (const stage of stages) {
        for (const step of stage.steps) {
          for (const sf of step.screenFunctions) {
            screenCount++;
            for (const metric of sf.metrics) {
              const cat = categoryTotals.get(metric.metricCategoryId);
              if (cat) {
                cat.total += metric.value;
              }
            }
          }
        }
      }

      const categories = Array.from(categoryTotals.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        total: data.total,
      }));

      const totalValue = categories.reduce((sum, cat) => sum + cat.total, 0);

      result.push({
        metricTypeId: metricType.id,
        metricTypeName: metricType.name,
        categories,
        totalValue,
        screenCount,
        avgPerScreen: screenCount > 0 ? totalValue / screenCount : 0,
      });
    }

    return result;
  }, [projectMetricTypeSummary, stageFilter]);

  // Get all screen metrics data for heat map and top issues
  const allScreenMetrics = useMemo((): ScreenMetricData[] => {
    const result: ScreenMetricData[] = [];

    const stages = stageFilter
      ? projectMetricTypeSummary.stages.filter(s => s.stageId === Number(stageFilter))
      : projectMetricTypeSummary.stages;

    for (const stage of stages) {
      for (const step of stage.steps) {
        for (const sf of step.screenFunctions) {
          const metrics: Record<number, number> = {};
          let totalIssues = 0;

          for (const metric of sf.metrics) {
            metrics[metric.metricCategoryId] = metric.value;
            // Don't count test case "Total" or "Passed" in issues
            const category = projectMetricTypeSummary.metricTypes
              .flatMap(mt => mt.categories)
              .find(c => c.id === metric.metricCategoryId);

            if (category) {
              const catName = category.name.toLowerCase();
              // Only count as issues if it's not "total", "passed" in test cases
              if (!catName.includes('total') && !catName.includes('passed')) {
                totalIssues += metric.value;
              }
            }
          }

          result.push({
            screenFunctionId: sf.screenFunctionId,
            screenFunctionName: sf.screenFunctionName,
            stepName: step.stepName,
            stageName: stage.stageName,
            stageId: stage.stageId,
            metrics,
            totalIssues,
          });
        }
      }
    }

    return result;
  }, [projectMetricTypeSummary, stageFilter]);

  // Heat map data grouped by stage
  const heatMapData = useMemo((): StageHeatMapData[] => {
    const stageMap = new Map<number, StageHeatMapData>();

    for (const screen of allScreenMetrics) {
      if (!stageMap.has(screen.stageId)) {
        stageMap.set(screen.stageId, {
          stageId: screen.stageId,
          stageName: screen.stageName,
          screens: [],
        });
      }

      const stageData = stageMap.get(screen.stageId)!;
      stageData.screens.push({
        screenFunctionId: screen.screenFunctionId,
        screenFunctionName: screen.screenFunctionName,
        status: screen.totalIssues === 0 ? 'good' : screen.totalIssues <= 5 ? 'warning' : 'critical',
        totalIssues: screen.totalIssues,
      });
    }

    return Array.from(stageMap.values());
  }, [allScreenMetrics]);

  // Top issues - screens sorted by total issues
  const topIssues = useMemo(() => {
    return [...allScreenMetrics]
      .filter(s => s.totalIssues > 0)
      .sort((a, b) => b.totalIssues - a.totalIssues)
      .slice(0, 10);
  }, [allScreenMetrics]);

  // Calculate test pass rate for Test Cases metric type
  const getTestPassRate = (metricType: AggregatedMetrics) => {
    const totalCat = metricType.categories.find(c => c.name.toLowerCase().includes('total'));
    const passedCat = metricType.categories.find(c => c.name.toLowerCase().includes('passed'));

    if (totalCat && passedCat && totalCat.total > 0) {
      return ((passedCat.total / totalCat.total) * 100).toFixed(1);
    }
    return null;
  };

  // Get status color for a metric type
  const getStatusIndicator = (metric: AggregatedMetrics) => {
    const normalized = metric.metricTypeName.toLowerCase();

    if (normalized.includes('test')) {
      const passRate = getTestPassRate(metric);
      if (passRate === null) return { color: 'bg-gray-400', label: 'N/A' };
      const rate = parseFloat(passRate);
      if (rate >= 95) return { color: 'bg-emerald-500', label: t('status.good') };
      if (rate >= 80) return { color: 'bg-amber-500', label: t('status.warning') };
      return { color: 'bg-red-500', label: t('status.atRisk') };
    }

    // For bugs and review issues
    if (metric.totalValue === 0) return { color: 'bg-emerald-500', label: t('status.good') };
    if (metric.avgPerScreen <= 2) return { color: 'bg-amber-500', label: t('status.warning') };
    return { color: 'bg-red-500', label: t('status.atRisk') };
  };

  const views = [
    { id: 'overview', label: t('metrics.dashboardOverview', 'Overview') },
    { id: 'heatmap', label: t('metrics.dashboardHeatmap', 'Heat Map') },
    { id: 'issues', label: t('metrics.dashboardTopIssues', 'Top Issues') },
    { id: 'distribution', label: t('metrics.dashboardDistribution', 'Distribution') },
  ] as const;

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {view.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview - Summary Cards */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aggregatedMetrics.map(metric => {
              const colors = getMetricTypeColor(metric.metricTypeName);
              const status = getStatusIndicator(metric);
              const passRate = getTestPassRate(metric);

              return (
                <div
                  key={metric.metricTypeId}
                  className={`rounded-xl border-2 ${colors.accent} ${colors.bg} p-5 transition-shadow hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{colors.icon}</span>
                      <div>
                        <h3 className={`font-semibold ${colors.text}`}>{metric.metricTypeName}</h3>
                        <p className="text-xs text-gray-500">
                          {metric.screenCount} {t('metrics.screens', 'screens')}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
                      {status.label}
                    </div>
                  </div>

                  <div className="mt-4">
                    {passRate !== null ? (
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold ${colors.text}`}>{passRate}%</span>
                        <span className="text-sm text-gray-500">{t('metrics.passRate', 'pass rate')}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold ${colors.text}`}>{metric.totalValue.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">{t('common.total', 'total')}</span>
                      </div>
                    )}

                    <div className="mt-1 text-xs text-gray-500">
                      {t('metrics.avgPerScreen', 'Avg per screen')}: {metric.avgPerScreen.toFixed(1)}
                    </div>
                  </div>

                  {/* Category breakdown mini bars */}
                  <div className="mt-4 space-y-2">
                    {metric.categories.slice(0, 4).map((cat, idx) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-24 truncate" title={cat.name}>{cat.name}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} rounded-full`}
                            style={{ width: `${metric.totalValue > 0 ? (cat.total / metric.totalValue) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{cat.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{allScreenMetrics.length}</div>
              <div className="text-sm text-gray-500">{t('metrics.totalScreens', 'Total Screens')}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {allScreenMetrics.filter(s => s.totalIssues === 0).length}
              </div>
              <div className="text-sm text-gray-500">{t('metrics.cleanScreens', 'Clean Screens')}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {allScreenMetrics.filter(s => s.totalIssues > 0 && s.totalIssues <= 5).length}
              </div>
              <div className="text-sm text-gray-500">{t('metrics.warningScreens', 'Warning')}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {allScreenMetrics.filter(s => s.totalIssues > 5).length}
              </div>
              <div className="text-sm text-gray-500">{t('metrics.criticalScreens', 'Critical')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Heat Map View */}
      {activeView === 'heatmap' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            {t('metrics.heatmapDescription', 'Visual overview of quality status across all screens by stage. Click on a cell to see details.')}
          </p>

          {heatMapData.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {t('metrics.noDataForHeatmap', 'No data available for heat map')}
            </div>
          ) : (
            <div className="space-y-4">
              {heatMapData.map(stage => (
                <div key={stage.stageId} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">{stage.stageName}</h4>
                    <p className="text-xs text-gray-500">{stage.screens.length} screens</p>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {stage.screens.map(screen => (
                        <div
                          key={screen.screenFunctionId}
                          className={`group relative px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            screen.status === 'good'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : screen.status === 'warning'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={`${screen.screenFunctionName}: ${screen.totalIssues} issues`}
                        >
                          <span className="truncate max-w-[150px] inline-block align-bottom">
                            {screen.screenFunctionName}
                          </span>
                          {screen.totalIssues > 0 && (
                            <span className="ml-1 font-bold">({screen.totalIssues})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-500">{t('metrics.legend', 'Legend')}:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200" />
              <span>{t('metrics.noIssues', 'No issues')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
              <span>{t('metrics.fewIssues', '1-5 issues')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
              <span>{t('metrics.manyIssues', '6+ issues')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Issues View */}
      {activeView === 'issues' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('metrics.topIssuesDescription', 'Screens with the most issues that need attention.')}
          </p>

          {topIssues.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-lg font-medium text-emerald-600">
                {t('metrics.noIssuesFound', 'No issues found!')}
              </div>
              <div className="text-sm text-gray-500">
                {t('metrics.allScreensClean', 'All screens are clean.')}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {topIssues.map((screen, index) => (
                <div
                  key={screen.screenFunctionId}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    index === 0
                      ? 'border-red-200 bg-red-50'
                      : index < 3
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-red-500' : index < 3 ? 'bg-amber-500' : 'bg-gray-400'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{screen.screenFunctionName}</div>
                    <div className="text-xs text-gray-500">
                      {screen.stageName} → {screen.stepName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      screen.totalIssues > 10
                        ? 'bg-red-100 text-red-800'
                        : screen.totalIssues > 5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {screen.totalIssues} {t('metrics.issues', 'issues')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Distribution View */}
      {activeView === 'distribution' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            {t('metrics.distributionDescription', 'Breakdown of issues by category for each metric type.')}
          </p>

          {aggregatedMetrics.map(metric => {
            const colors = getMetricTypeColor(metric.metricTypeName);
            const maxValue = Math.max(...metric.categories.map(c => c.total), 1);

            return (
              <div key={metric.metricTypeId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className={`${colors.bg} px-4 py-3 border-b ${colors.accent}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{colors.icon}</span>
                    <h4 className={`font-medium ${colors.text}`}>{metric.metricTypeName}</h4>
                    <span className="text-sm text-gray-500 ml-auto">
                      {t('common.total')}: {metric.totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {metric.categories.map((cat, idx) => {
                    const percentage = metric.totalValue > 0 ? (cat.total / metric.totalValue) * 100 : 0;

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{cat.name}</span>
                          <span className="text-gray-500">
                            {cat.total.toLocaleString()} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${(cat.total / maxValue) * 100}%`, minWidth: cat.total > 0 ? '2rem' : 0 }}
                          >
                            {cat.total > 0 && (
                              <span className="text-xs font-bold text-white">{cat.total}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MetricsDashboard;
