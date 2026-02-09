import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { reportApi, metricsApi, commentaryApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Modal, ProgressBar } from '@/components/common';
import { CommentaryForm } from '@/components/forms';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/reports/$reportId')({
  component: ReportDetail,
});

function ReportDetail() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAddCommentary, setShowAddCommentary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', parseInt(reportId)],
    queryFn: async () => {
      const response = await reportApi.getOne(parseInt(reportId));
      return response.data;
    },
  });

  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['metrics', parseInt(reportId)],
    queryFn: async () => {
      const response = await metricsApi.getByReport(parseInt(reportId));
      return response.data;
    },
    enabled: !!report,
  });

  // Auto-calculate metrics if not exist
  const calculateMetricsMutation = useMutation({
    mutationFn: async () => {
      if (!report) return null;

      if (report.scope === 'Project') {
        return metricsApi.calculateProject(report.projectId, parseInt(reportId));
      } else if (report.scope === 'Stage' && report.stageId) {
        return metricsApi.calculateStage(report.stageId, parseInt(reportId));
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', parseInt(reportId)] });
    },
  });

  // Trigger auto-calculation when report is loaded but no metrics exist
  useEffect(() => {
    if (report && !isMetricsLoading && (!metrics || metrics.length === 0) && !calculateMetricsMutation.isPending) {
      calculateMetricsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, metrics?.length, isMetricsLoading]);

  const { data: commentaries } = useQuery({
    queryKey: ['commentaries', parseInt(reportId)],
    queryFn: async () => {
      const response = await commentaryApi.getByReport(parseInt(reportId));
      return response.data;
    },
    enabled: !!report,
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: () => reportApi.delete(parseInt(reportId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate({ to: '/reports' });
    },
  });

  // Get snapshot data from the report (frozen at time of creation)
  // For new reports, use snapshot data. For old reports without snapshots, fall back to real-time
  const hasSnapshot = report?.snapshotData && report?.snapshotAt;

  // Fallback: Fetch real-time productivity metrics for old reports without snapshot
  const { data: realtimeProductivity } = useQuery({
    queryKey: ['productivity', report?.projectId],
    queryFn: async () => {
      if (!report?.projectId) return null;
      const response = await metricsApi.getProjectProductivity(report.projectId);
      return response.data;
    },
    enabled: !!report?.projectId && report?.scope === 'Project' && !hasSnapshot,
  });

  // Fallback: Fetch real-time member cost for old reports without snapshot
  const { data: realtimeMemberCost } = useQuery({
    queryKey: ['memberCost', report?.projectId],
    queryFn: async () => {
      if (!report?.projectId) return null;
      const response = await metricsApi.getProjectMemberCost(report.projectId);
      return response.data;
    },
    enabled: !!report?.projectId && report?.scope === 'Project' && !hasSnapshot,
  });

  // Use snapshot data if available, otherwise fall back to real-time
  const productivity = hasSnapshot ? report?.snapshotData?.productivity : realtimeProductivity;
  const memberCost = hasSnapshot ? report?.snapshotData?.memberCost : realtimeMemberCost;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('report.detail.notFound')}</p>
      </div>
    );
  }

  const metric = metrics?.[0];

  // Helper functions for status colors
  const getSPIColor = (spi: number) => {
    if (spi >= 0.95) return 'text-green-600';
    if (spi >= 0.80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCPIColor = (cpi: number) => {
    if (cpi >= 0.95) return 'text-green-600';
    if (cpi >= 0.80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDelayRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallHealth = () => {
    if (!metric) return { status: t('common.unknown'), color: 'bg-gray-500' };

    const spi = metric.schedulePerformanceIndex;
    const cpi = metric.costPerformanceIndex;

    // Check for "At Risk" conditions
    // CPI < 0.83 means > 20% over budget, or SPI < 0.8 means severely behind schedule
    const hasBudgetRisk = cpi < 0.83;
    const hasScheduleRisk = spi < 0.8;

    if (hasBudgetRisk || hasScheduleRisk) {
      return { status: t('metrics.atRisk'), color: 'bg-red-500' };
    }

    // Check for "Warning" conditions
    // CPI 0.83-1.0 means slightly over budget, SPI 0.8-0.95 means slightly behind schedule
    const hasBudgetWarning = cpi >= 0.83 && cpi < 1.0;
    const hasScheduleWarning = spi >= 0.8 && spi < 0.95;

    if (hasBudgetWarning || hasScheduleWarning) {
      return { status: t('metrics.warning'), color: 'bg-yellow-500' };
    }

    // Good: CPI >= 1.0 (efficient) and SPI >= 0.95 (on schedule)
    return { status: t('metrics.good'), color: 'bg-green-500' };
  };

  const health = getOverallHealth();

  const scopeReportLabels: Record<string, string> = {
    Project: t('report.scopeProjectReport'),
    Stage: t('report.scopeStageReport'),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
          ← {t('report.detail.backToReports')}
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span className="font-medium">{scopeReportLabels[report.scope]}</span>
              {report.stageName && <span>• {report.stageName}</span>}
              <span>• {format(new Date(report.reportDate), 'MMM dd, yyyy')}</span>
            </div>
            {/* Snapshot indicator */}
            {hasSnapshot && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('report.snapshot')}: {format(new Date(report.snapshotAt!), 'dd/MM/yyyy HH:mm')}
                </span>
                <span className="text-gray-400 text-xs">
                  ({t('report.snapshotNote')})
                </span>
              </div>
            )}
            {!hasSnapshot && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('report.realtime')}
                </span>
                <span className="text-gray-400 text-xs">
                  ({t('report.realtimeNote')})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {metric && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{t('report.overallHealth')}:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${health.color}`}>
                  <span className="h-2 w-2 bg-white rounded-full"></span>
                  {health.status}
                </span>
              </div>
            )}
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              {t('report.delete')}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {metric && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('metrics.kpi')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SPI */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.schedulePerformance')}</p>
                  <span className="text-2xl">📅</span>
                </div>
                <p className={`text-4xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
                  {metric.schedulePerformanceIndex.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.schedulePerformanceIndex >= 1
                    ? `✓ ${t('metrics.onSchedule')}`
                    : `⚠ ${t('metrics.behindSchedule')}`}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('metrics.target')}: 1.0+</span>
                    <span>{metric.schedulePerformanceIndex >= 0.95 ? t('metrics.good') : metric.schedulePerformanceIndex >= 0.80 ? t('metrics.warning') : t('metrics.atRisk')}</span>
                  </div>
                  <ProgressBar
                    progress={Math.min(metric.schedulePerformanceIndex * 100, 100)}
                    className={metric.schedulePerformanceIndex >= 0.95 ? 'bg-green-500' : metric.schedulePerformanceIndex >= 0.80 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
              </Card>

              {/* CPI */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.costPerformance')}</p>
                  <span className="text-2xl">💰</span>
                </div>
                <p className={`text-4xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {metric.costPerformanceIndex.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.costPerformanceIndex >= 1
                    ? `✓ ${t('metrics.underBudget')}`
                    : `⚠ ${t('metrics.overBudget')}`}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('metrics.target')}: 1.0+</span>
                    <span>{metric.costPerformanceIndex >= 0.95 ? t('metrics.good') : metric.costPerformanceIndex >= 0.80 ? t('metrics.warning') : t('metrics.atRisk')}</span>
                  </div>
                  <ProgressBar
                    progress={Math.min(metric.costPerformanceIndex * 100, 100)}
                    className={metric.costPerformanceIndex >= 0.95 ? 'bg-green-500' : metric.costPerformanceIndex >= 0.80 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
              </Card>

              {/* Delay Rate */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.delayRate')}</p>
                  <span className="text-2xl">⏱️</span>
                </div>
                <p className={`text-4xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
                  {metric.delayRate.toFixed(1)}%
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.delayRate <= 5
                    ? `✓ ${t('metrics.minimalDelays')}`
                    : metric.delayRate <= 20
                      ? `⚠ ${t('metrics.someDelays')}`
                      : `⚠ ${t('metrics.significantDelays')}`}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('metrics.target')}: &lt;5%</span>
                    <span>{metric.delayRate <= 5 ? t('metrics.good') : metric.delayRate <= 20 ? t('metrics.warning') : t('metrics.atRisk')}</span>
                  </div>
                  <ProgressBar
                    progress={Math.min(metric.delayRate, 100)}
                    className={metric.delayRate <= 5 ? 'bg-green-500' : metric.delayRate <= 20 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* EVM Core Values */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('metrics.evm')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('metrics.evmDescription')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-50">
                <p className="text-xs font-medium text-blue-600 mb-1">{t('metrics.bac')}</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600">{t('metrics.bacFull')}</p>
              </Card>

              <Card className="bg-slate-50">
                <p className="text-xs font-medium text-slate-600 mb-1">{t('metrics.pv')}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {metric.plannedValue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600">{t('metrics.pvFull')}</p>
              </Card>

              <Card className="bg-green-50">
                <p className="text-xs font-medium text-green-600 mb-1">{t('metrics.ev')}</p>
                <p className="text-2xl font-bold text-green-900">
                  {metric.earnedValue.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">{t('metrics.evFull')}</p>
              </Card>

              <Card className="bg-amber-50">
                <p className="text-xs font-medium text-amber-600 mb-1">{t('metrics.ac')}</p>
                <p className="text-2xl font-bold text-amber-900">
                  {metric.actualCost.toFixed(2)}
                </p>
                <p className="text-xs text-amber-600">{t('metrics.acFull')}</p>
              </Card>

              <Card className="bg-purple-50">
                <p className="text-xs font-medium text-purple-600 mb-1">{t('metrics.spi')}</p>
                <p className={`text-2xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
                  {metric.schedulePerformanceIndex.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">{t('metrics.spiFull')}</p>
              </Card>

              <Card className="bg-indigo-50">
                <p className="text-xs font-medium text-indigo-600 mb-1">{t('metrics.cpi')}</p>
                <p className={`text-2xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {metric.costPerformanceIndex.toFixed(2)}
                </p>
                <p className="text-xs text-indigo-600">{t('metrics.cpiFull')}</p>
              </Card>
            </div>
          </div>

          {/* Forecasting Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('metrics.forecasting')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('metrics.forecastingDescription')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* EAC Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">{t('metrics.eacFull')}</p>
                  <span className="text-xl">🎯</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {(metric.estimateAtCompletion || (metric.actualCost + (metric.plannedValue - metric.earnedValue) / (metric.costPerformanceIndex || 1))).toFixed(2)} {t('time.mm')}
                </p>
                <p className="text-xs text-blue-600 mt-1">{t('metrics.eacFormula')}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('metrics.bac')}: {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}</span>
                    {(() => {
                      const eac = metric.estimateAtCompletion || (metric.actualCost + (metric.plannedValue - metric.earnedValue) / (metric.costPerformanceIndex || 1));
                      const bac = metric.budgetAtCompletion || metric.plannedValue;
                      const diff = ((eac - bac) / bac) * 100;
                      return (
                        <span className={diff > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </div>
                  <ProgressBar
                    progress={Math.min(100, ((metric.estimateAtCompletion || metric.actualCost) / (metric.budgetAtCompletion || metric.plannedValue || 1)) * 100)}
                    className={
                      (metric.estimateAtCompletion || metric.actualCost) <= (metric.budgetAtCompletion || metric.plannedValue)
                        ? 'bg-green-500'
                        : (metric.estimateAtCompletion || metric.actualCost) <= (metric.budgetAtCompletion || metric.plannedValue) * 1.1
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }
                  />
                </div>
              </Card>

              {/* VAC Card */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.vacFull')}</p>
                  <span className="text-xl">📉</span>
                </div>
                {(() => {
                  const vac = metric.varianceAtCompletion || ((metric.budgetAtCompletion || metric.plannedValue) - (metric.estimateAtCompletion || metric.actualCost));
                  const isPositive = vac >= 0;
                  return (
                    <>
                      <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{vac.toFixed(2)} {t('time.mm')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{t('metrics.vacFormula')}</p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isPositive ? `✓ ${t('metrics.underBudget')}` : `⚠ ${t('metrics.overBudget')}`}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </Card>

              {/* TCPI Card */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.tcpiFull')}</p>
                  <span className="text-xl">📈</span>
                </div>
                {(() => {
                  const tcpi = metric.toCompletePerformanceIndex || ((metric.plannedValue - metric.earnedValue) / ((metric.budgetAtCompletion || metric.plannedValue) - metric.actualCost));
                  const isAchievable = tcpi <= 1.1;
                  const isHard = tcpi > 1.1 && tcpi <= 1.3;
                  return (
                    <>
                      <p className={`text-3xl font-bold ${isAchievable ? 'text-green-600' : isHard ? 'text-yellow-600' : 'text-red-600'}`}>
                        {tcpi > 10 ? '>10' : tcpi.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{t('metrics.tcpiFormula')}</p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isAchievable ? 'bg-green-100 text-green-800' : isHard ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isAchievable ? `✓ ${t('metrics.achievable')}` : isHard ? `⚠ ${t('metrics.challenging')}` : `✗ ${t('metrics.veryDifficult')}`}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </Card>

              {/* Status Summary */}
              <Card className={`border-2 ${
                (() => {
                  const eac = metric.estimateAtCompletion || metric.actualCost;
                  const bac = metric.budgetAtCompletion || metric.plannedValue;
                  if (eac <= bac) return 'border-green-200 bg-green-50';
                  if (eac <= bac * 1.1) return 'border-yellow-200 bg-yellow-50';
                  return 'border-red-200 bg-red-50';
                })()
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{t('metrics.budgetStatus')}</p>
                  <span className="text-xl">💰</span>
                </div>
                {(() => {
                  const eac = metric.estimateAtCompletion || metric.actualCost;
                  const bac = metric.budgetAtCompletion || metric.plannedValue;
                  const diff = eac - bac;
                  const diffPercent = bac > 0 ? (diff / bac) * 100 : 0;

                  let status, color, icon;
                  if (diff <= 0) {
                    status = t('metrics.underControl');
                    color = 'text-green-700';
                    icon = '✓';
                  } else if (diffPercent <= 10) {
                    status = t('metrics.slightOverrun');
                    color = 'text-yellow-700';
                    icon = '⚠';
                  } else {
                    status = t('metrics.overBudget');
                    color = 'text-red-700';
                    icon = '✗';
                  }

                  return (
                    <>
                      <p className={`text-2xl font-bold ${color}`}>
                        {icon} {status}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {diff <= 0
                          ? t('metrics.savingsMessage', { value: Math.abs(diff).toFixed(2) })
                          : t('metrics.overrunMessage', { value: diff.toFixed(2), percent: diffPercent.toFixed(1) })}
                      </p>
                    </>
                  );
                })()}
              </Card>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('metrics.qualityMetrics')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🐛</span>
                  <p className="text-sm font-medium text-gray-600">{t('metrics.defectRate')}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.defectRate.toFixed(3)}
                </p>
                <p className="mt-1 text-xs text-gray-500">{t('metrics.defectsPerTestCase')}</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⏱️</span>
                  <p className="text-sm font-medium text-gray-600">{t('metrics.delayRate')}</p>
                </div>
                <p className={`text-3xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
                  {metric.delayRate.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-gray-500">{t('metrics.tasksDelayed')}</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <p className="text-sm font-medium text-gray-600">{t('metrics.efficiency')}</p>
                </div>
                <p className={`text-3xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {(metric.costPerformanceIndex * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-gray-500">{t('metrics.cpiAsPercentage')}</p>
              </Card>
            </div>
          </div>

          {/* Productivity Section - Only for Project reports */}
          {productivity && productivity.byMember && productivity.byMember.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('productivity.title')}</h2>
              <p className="text-sm text-gray-500 mb-4">{t('productivity.description')}</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white">
                  <p className="text-sm font-medium text-indigo-600">{t('productivity.teamEfficiency')}</p>
                  <p className={`text-3xl font-bold ${productivity.summary.efficiency >= 1 ? 'text-green-600' : productivity.summary.efficiency >= 0.83 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(productivity.summary.efficiency * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">{t('productivity.overallTeamEfficiency')}</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('productivity.tasksCompleted')}</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {productivity.summary.tasksCompleted}/{productivity.summary.tasksTotal}
                  </p>
                  <p className="text-xs text-gray-500">{productivity.summary.completionRate}% {t('productivity.completionRate')}</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('productivity.avgEffortPerTask')}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {productivity.summary.avgEffortPerTask.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">{t('productivity.manHoursPerTask')}</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('productivity.variance')}</p>
                  <p className={`text-3xl font-bold ${productivity.summary.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {productivity.summary.variance > 0 ? '+' : ''}{productivity.summary.variancePercent}%
                  </p>
                  <p className="text-xs text-gray-500">{t('productivity.actualVsEstimated')}</p>
                </Card>
              </div>

              {/* Member Performance Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title={t('productivity.byMember')}>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">{t('productivity.member')}</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">{t('productivity.role')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('productivity.tasks')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('metrics.efficiency')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {productivity.byMember.slice(0, 10).map((member: any) => (
                          <tr key={member.memberId} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{member.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{member.role}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {member.tasksCompleted}/{member.tasksTotal}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-semibold ${member.efficiency >= 1 ? 'text-green-600' : member.efficiency >= 0.83 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {(member.efficiency * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card title={t('productivity.byRole')}>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">{t('productivity.role')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('productivity.members')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('productivity.tasks')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('productivity.avgPerTask')}</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">{t('metrics.efficiency')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {productivity.byRole.map((role: any) => (
                          <tr key={role.role} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{role.role}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{role.memberCount}</td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {role.tasksCompleted}/{role.tasksTotal}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {role.avgEffortPerTask.toFixed(1)}h
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-semibold ${role.efficiency >= 1 ? 'text-green-600' : role.efficiency >= 0.83 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {(role.efficiency * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Member Cost Analysis - Only shows if members have hourly rates */}
          {memberCost && memberCost.byMember && memberCost.byMember.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">💵 {t('memberCost.title')}</h2>
              <p className="text-sm text-gray-500 mb-4">{t('memberCost.description')}</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className={`border-2 ${memberCost.insights.costStatus === 'under_budget' ? 'border-green-200 bg-green-50' : memberCost.insights.costStatus === 'slight_over' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="text-sm font-medium text-gray-600">{t('memberCost.totalActualCost')}</p>
                  <p className={`text-3xl font-bold ${memberCost.insights.costStatus === 'under_budget' ? 'text-green-600' : memberCost.insights.costStatus === 'slight_over' ? 'text-yellow-600' : 'text-red-600'}`}>
                    ${memberCost.summary.totalActualCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('memberCost.estimated')}: ${memberCost.summary.totalEstimatedCost.toLocaleString()}
                  </p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('memberCost.costVariance')}</p>
                  <p className={`text-3xl font-bold ${memberCost.summary.totalCostVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {memberCost.summary.totalCostVariance <= 0 ? '-' : '+'}${Math.abs(memberCost.summary.totalCostVariance).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {memberCost.summary.totalCostVariance <= 0 ? t('memberCost.savings') : t('memberCost.exceeded')} {Math.abs(memberCost.summary.totalCostVariancePercent)}% {t('memberCost.comparedToEstimate')}
                  </p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('memberCost.totalHoursWorked')}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {memberCost.summary.totalActualHours.toLocaleString()}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('memberCost.estimated')}: {memberCost.summary.totalEstimatedHours.toLocaleString()}h
                  </p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">{t('memberCost.overallEfficiency')}</p>
                  <p className={`text-3xl font-bold ${memberCost.summary.overallEfficiency >= 1 ? 'text-green-600' : memberCost.summary.overallEfficiency >= 0.8 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(memberCost.summary.overallEfficiency * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('memberCost.membersParticipated', { count: memberCost.summary.totalMembers })}
                  </p>
                </Card>
              </div>

              {/* Insights - Top Performers & Need Support */}
              {(memberCost.insights.topPerformers.length > 0 || memberCost.insights.needSupport.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {memberCost.insights.topPerformers.length > 0 && (
                    <Card className="bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">⭐</span>
                        <h4 className="font-semibold text-green-800">{t('memberCost.topPerformers')}</h4>
                      </div>
                      <div className="space-y-2">
                        {memberCost.insights.topPerformers.map((member: any, idx: number) => (
                          <div key={member.memberId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{(member.efficiency * 100).toFixed(0)}%</p>
                              <p className="text-xs text-gray-500">{member.efficiencyRating}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {memberCost.insights.needSupport.length > 0 && (
                    <Card className="bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🤝</span>
                        <h4 className="font-semibold text-orange-800">{t('memberCost.needSupport')}</h4>
                      </div>
                      <div className="space-y-2">
                        {memberCost.insights.needSupport.map((member: any) => (
                          <div key={member.memberId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-orange-600">{(member.efficiency * 100).toFixed(0)}%</p>
                              <p className="text-xs text-gray-500">{member.efficiencyRating}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-orange-700 mt-3">
                        💡 {t('memberCost.needSupportTip')}
                      </p>
                    </Card>
                  )}
                </div>
              )}

              {/* Member Cost Table */}
              <Card title={t('memberCost.detailByMember')}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('memberCost.member')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('memberCost.role')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.hourlyRate')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.hoursEstAct')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.estimatedCost')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.actualCost')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.costVariance')}</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500">{t('memberCost.efficiencyRating')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {memberCost.byMember.map((member: any) => (
                        <tr key={member.memberId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.tasks.length} {t('productivity.tasks')}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{member.role}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            ${member.hourlyRate}/h
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {member.totalEstimatedHours.toFixed(1)}h / {member.totalActualHours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            ${member.totalEstimatedCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            ${member.totalActualCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${member.costVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {member.costVariance <= 0 ? '-' : '+'}${Math.abs(member.costVariance).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 block">
                              ({member.costVariancePercent > 0 ? '+' : ''}{member.costVariancePercent}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              member.efficiencyColor === 'green' ? 'bg-green-100 text-green-800' :
                              member.efficiencyColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                              member.efficiencyColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(member.efficiency * 100).toFixed(0)}% - {member.efficiencyRating}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-gray-700">{t('common.total')}:</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ${memberCost.summary.totalEstimatedCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          ${memberCost.summary.totalActualCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={memberCost.summary.totalCostVariance <= 0 ? 'text-green-600' : 'text-red-600'}>
                            {memberCost.summary.totalCostVariance <= 0 ? '-' : '+'}${Math.abs(memberCost.summary.totalCostVariance).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            memberCost.summary.overallEfficiency >= 1 ? 'bg-green-100 text-green-800' :
                            memberCost.summary.overallEfficiency >= 0.8 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(memberCost.summary.overallEfficiency * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>

              {/* Stage Cost Breakdown */}
              {memberCost.byStage && memberCost.byStage.length > 0 && (
                <Card title={t('memberCost.costByStage')} className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">{t('memberCost.stage')}</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.memberCount')}</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.estimatedCost')}</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.actualCost')}</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">{t('memberCost.costVariance')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {memberCost.byStage.map((stage: any) => (
                          <tr key={stage.stageName} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{stage.stageName}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{stage.memberCount}</td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ${stage.estimatedCost.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              ${stage.actualCost.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium ${stage.costVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stage.costVariance <= 0 ? '-' : '+'}${Math.abs(stage.costVariance).toLocaleString()}
                                <span className="text-xs text-gray-500 ml-1">
                                  ({stage.costVariancePercent > 0 ? '+' : ''}{stage.costVariancePercent}%)
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Efficiency Legend */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">📊 {t('memberCost.efficiencyLegend')}:</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">≥120%</span>
                    <span className="text-gray-600">{t('memberCost.efficiencyExcellent')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">100-119%</span>
                    <span className="text-gray-600">{t('memberCost.efficiencyGood')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">80-99%</span>
                    <span className="text-gray-600">{t('memberCost.efficiencyAcceptable')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">&lt;80%</span>
                    <span className="text-gray-600">{t('memberCost.efficiencyNeedsImprovement')}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('memberCost.efficiencyFormula')}
                </p>
              </div>
            </div>
          )}

          {/* Summary Insights */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <span className="text-3xl">💡</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('insights.title')}</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${metric.schedulePerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>•</span>
                <span>
                  <strong>{t('insights.schedule')}:</strong>{' '}
                  {t('insights.scheduleSummary', {
                    status: metric.schedulePerformanceIndex >= 1 ? t('insights.aheadOfSchedule') : t('insights.behindSchedule'),
                    value: Math.abs((1 - metric.schedulePerformanceIndex) * 100).toFixed(1),
                  })}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${metric.costPerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>•</span>
                <span>
                  <strong>{t('insights.budget')}:</strong>{' '}
                  {t('insights.budgetSummary', {
                    status: metric.costPerformanceIndex >= 1 ? t('insights.underBudget') : t('insights.overBudget'),
                    value: Math.abs((1 - metric.costPerformanceIndex) * 100).toFixed(1),
                  })}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${metric.delayRate <= 5 ? 'text-green-600' : metric.delayRate <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>•</span>
                <span>
                  <strong>{t('insights.delays')}:</strong>{' '}
                  {t('insights.delaysSummary', {
                    value: metric.delayRate.toFixed(1),
                    impact: metric.delayRate <= 5 ? t('insights.minimalImpact') : metric.delayRate <= 20 ? t('insights.moderateImpact') : t('insights.significantImpact'),
                  })}
                </span>
              </li>
              <li className="flex items-start gap-2">
                {(() => {
                  const eac = metric.estimateAtCompletion || metric.actualCost;
                  const bac = metric.budgetAtCompletion || metric.plannedValue;
                  const diff = eac - bac;
                  const isUnder = diff <= 0;
                  return (
                    <>
                      <span className={`mt-0.5 ${isUnder ? 'text-green-600' : 'text-red-600'}`}>•</span>
                      <span>
                        <strong>{t('insights.forecast')}:</strong>{' '}
                        {t('insights.forecastSummary', {
                          value: eac.toFixed(2),
                          unit: t('time.mm'),
                          status: isUnder
                            ? t('insights.savingsVsBudget', { value: Math.abs(diff).toFixed(2) })
                            : t('insights.overrunVsBudget', { value: diff.toFixed(2), percent: ((diff / bac) * 100).toFixed(1) }),
                        })}
                      </span>
                    </>
                  );
                })()}
              </li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Commentaries Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('report.commentary')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('report.detail.commentaryDescription')}
            </p>
          </div>
          <Button onClick={() => setShowAddCommentary(true)}>
            ✍️ {t('report.addCommentary')}
          </Button>
        </div>

        {commentaries && commentaries.length > 0 ? (
          <div className="space-y-4">
            {commentaries.map((commentary) => (
              <Card key={commentary.id} className="border-l-4 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        commentary.type === 'AI Generated'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {commentary.type === 'AI Generated'
                          ? `🤖 ${t('report.aiCommentary')}`
                          : `👤 ${t('report.manualCommentary')}`}
                      </span>
                      {commentary.author && (
                        <span className="text-sm font-medium text-gray-700">
                          {t('report.detail.commentaryBy', { author: commentary.author })}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        • {format(new Date(commentary.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        v{commentary.version}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {commentary.content}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📝</span>
              <p className="text-gray-600 font-medium mb-2">{t('report.noCommentary')}</p>
              <p className="text-sm text-gray-500 mb-4">
                {t('report.addFirstCommentary')}
              </p>
              <Button onClick={() => setShowAddCommentary(true)} size="sm">
                {t('report.detail.addFirstCommentaryButton')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Commentary Modal */}
      <Modal
        isOpen={showAddCommentary}
        onClose={() => setShowAddCommentary(false)}
        title={t('report.addCommentary')}
      >
        <CommentaryForm
          reportId={parseInt(reportId)}
          onSuccess={() => setShowAddCommentary(false)}
          onCancel={() => setShowAddCommentary(false)}
        />
      </Modal>

      {/* Delete Report Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('report.delete')}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('report.detail.deleteConfirm', { title: report.title })}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-800 font-medium">{t('common.warning')}</p>
                <p className="text-yellow-700 text-sm mt-1">
                  {t('report.deleteWarning')}
                </p>
                <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                  <li>{t('report.deleteWarningMetrics')}</li>
                  <li>{t('report.deleteWarningCommentaries')}</li>
                </ul>
                <p className="text-yellow-700 text-sm mt-2 font-medium">
                  {t('report.deleteIrreversible')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteReportMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteReportMutation.mutate()}
              loading={deleteReportMutation.isPending}
            >
              {t('report.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
