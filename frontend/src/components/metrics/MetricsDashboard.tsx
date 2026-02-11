import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
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

  const handleTabChange = (_: React.SyntheticEvent, newValue: typeof activeView) => {
    setActiveView(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* View Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeView} onChange={handleTabChange}>
          <Tab label={t('metrics.dashboardOverview', 'Overview')} value="overview" />
          <Tab label={t('metrics.dashboardHeatmap', 'Heat Map')} value="heatmap" />
          <Tab label={t('metrics.dashboardTopIssues', 'Top Issues')} value="issues" />
          <Tab label={t('metrics.dashboardDistribution', 'Distribution')} value="distribution" />
        </Tabs>
      </Box>

      {/* Overview - Summary Cards */}
      {activeView === 'overview' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Summary Cards */}
          <Grid container spacing={2}>
            {aggregatedMetrics.map(metric => {
              const colors = getMetricTypeColor(metric.metricTypeName);
              const status = getStatusIndicator(metric);
              const passRate = getTestPassRate(metric);

              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={metric.metricTypeId}>
                  <Card
                    className={`h-full ${colors.accent} ${colors.bg}`}
                    sx={{ borderRadius: 3, border: 2, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{colors.icon}</span>
                          <div>
                            <Typography variant="subtitle1" fontWeight={600} className={colors.text}>
                              {metric.metricTypeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {metric.screenCount} {t('metrics.screens', 'screens')}
                            </Typography>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
                          {status.label}
                        </div>
                      </div>

                      <Box sx={{ mt: 2 }}>
                        {passRate !== null ? (
                          <div className="flex items-baseline gap-2">
                            <Typography variant="h4" fontWeight={700} className={colors.text}>{passRate}%</Typography>
                            <Typography variant="body2" color="text.secondary">{t('metrics.passRate', 'pass rate')}</Typography>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <Typography variant="h4" fontWeight={700} className={colors.text}>{metric.totalValue.toLocaleString()}</Typography>
                            <Typography variant="body2" color="text.secondary">{t('common.total', 'total')}</Typography>
                          </div>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          {t('metrics.avgPerScreen', 'Avg per screen')}: {metric.avgPerScreen.toFixed(1)}
                        </Typography>
                      </Box>

                      {/* Category breakdown mini bars */}
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Quick Stats */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" fontWeight={700}>{allScreenMetrics.length}</Typography>
                  <Typography variant="body2" color="text.secondary">{t('metrics.totalScreens', 'Total Screens')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {allScreenMetrics.filter(s => s.totalIssues === 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{t('metrics.cleanScreens', 'Clean Screens')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {allScreenMetrics.filter(s => s.totalIssues > 0 && s.totalIssues <= 5).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{t('metrics.warningScreens', 'Warning')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    {allScreenMetrics.filter(s => s.totalIssues > 5).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{t('metrics.criticalScreens', 'Critical')}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Heat Map View */}
      {activeView === 'heatmap' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t('metrics.heatmapDescription', 'Visual overview of quality status across all screens by stage. Click on a cell to see details.')}
          </Typography>

          {heatMapData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="text.secondary">{t('metrics.noDataForHeatmap', 'No data available for heat map')}</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {heatMapData.map(stage => (
                <Card key={stage.stageId}>
                  <Box sx={{ bgcolor: 'grey.50', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={500}>{stage.stageName}</Typography>
                    <Typography variant="caption" color="text.secondary">{stage.screens.length} screens</Typography>
                  </Box>
                  <CardContent>
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
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Legend */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="body2" color="text.secondary">{t('metrics.legend', 'Legend')}:</Typography>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200" />
              <Typography variant="body2">{t('metrics.noIssues', 'No issues')}</Typography>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
              <Typography variant="body2">{t('metrics.fewIssues', '1-5 issues')}</Typography>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
              <Typography variant="body2">{t('metrics.manyIssues', '6+ issues')}</Typography>
            </div>
          </Box>
        </Box>
      )}

      {/* Top Issues View */}
      {activeView === 'issues' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('metrics.topIssuesDescription', 'Screens with the most issues that need attention.')}
          </Typography>

          {topIssues.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h3" sx={{ mb: 1 }}>🎉</Typography>
              <Typography variant="h6" color="success.main">
                {t('metrics.noIssuesFound', 'No issues found!')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('metrics.allScreensClean', 'All screens are clean.')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {topIssues.map((screen, index) => (
                <Card
                  key={screen.screenFunctionId}
                  sx={{
                    border: 1,
                    borderColor: index === 0 ? 'error.light' : index < 3 ? 'warning.light' : 'divider',
                    bgcolor: index === 0 ? 'error.50' : index < 3 ? 'warning.50' : 'background.paper',
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'white',
                        bgcolor: index === 0 ? 'error.main' : index < 3 ? 'warning.main' : 'grey.400',
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{screen.screenFunctionName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {screen.stageName} → {screen.stepName}
                      </Typography>
                    </Box>

                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      screen.totalIssues > 10
                        ? 'bg-red-100 text-red-800'
                        : screen.totalIssues > 5
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {screen.totalIssues} {t('metrics.issues', 'issues')}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Distribution View */}
      {activeView === 'distribution' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t('metrics.distributionDescription', 'Breakdown of issues by category for each metric type.')}
          </Typography>

          {aggregatedMetrics.map(metric => {
            const colors = getMetricTypeColor(metric.metricTypeName);
            const maxValue = Math.max(...metric.categories.map(c => c.total), 1);

            return (
              <Card key={metric.metricTypeId}>
                <Box className={`${colors.bg} ${colors.accent}`} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span className="text-xl">{colors.icon}</span>
                    <Typography variant="subtitle2" fontWeight={500} className={colors.text}>{metric.metricTypeName}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      {t('common.total')}: {metric.totalValue.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {metric.categories.map((cat, idx) => {
                    const percentage = metric.totalValue > 0 ? (cat.total / metric.totalValue) * 100 : 0;

                    return (
                      <Box key={cat.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500}>{cat.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {cat.total.toLocaleString()} ({percentage.toFixed(1)}%)
                          </Typography>
                        </Box>
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
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default MetricsDashboard;
