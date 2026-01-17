import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { reportApi, metricsApi, commentaryApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Modal, ProgressBar } from '@/components/common';
import { CommentaryForm } from '@/components/forms';
import { format } from 'date-fns';

export const Route = createFileRoute('/reports/$reportId')({
  component: ReportDetail,
});

function ReportDetail() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
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
      } else if ((report.scope === 'Phase' || report.scope === 'Weekly') && report.phaseId) {
        return metricsApi.calculatePhase(report.phaseId, parseInt(reportId));
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

  // Fetch productivity metrics for Project reports
  const { data: productivity } = useQuery({
    queryKey: ['productivity', report?.projectId],
    queryFn: async () => {
      if (!report?.projectId) return null;
      const response = await metricsApi.getProjectProductivity(report.projectId);
      return response.data;
    },
    enabled: !!report?.projectId && report?.scope === 'Project',
  });

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
        <p className="text-gray-500">Report not found</p>
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

  const getPassRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDelayRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallHealth = () => {
    if (!metric) return { status: 'Unknown', color: 'bg-gray-500' };

    const cpi = metric.costPerformanceIndex;
    const passRate = metric.passRate;

    // Simplified logic matching Project status:
    // 1. CPI (Efficiency) is the main metric
    // 2. Pass Rate only considered if there is testing data (passRate > 0)

    // Check for "At Risk" conditions
    // CPI < 0.83 means > 20% over budget
    // Pass Rate < 80% (only if there is testing data)
    const hasBudgetRisk = cpi < 0.83;
    const hasQualityRisk = passRate > 0 && passRate < 80;

    if (hasBudgetRisk || hasQualityRisk) {
      return { status: 'At Risk', color: 'bg-red-500' };
    }

    // Check for "Warning" conditions
    // CPI 0.83-1.0 means slightly over budget
    // Pass Rate 80-95% (only if there is testing data)
    const hasBudgetWarning = cpi >= 0.83 && cpi < 1.0;
    const hasQualityWarning = passRate > 0 && passRate >= 80 && passRate < 95;

    if (hasBudgetWarning || hasQualityWarning) {
      return { status: 'Warning', color: 'bg-yellow-500' };
    }

    // Good: CPI >= 1.0 (efficient) AND quality is good or no testing data
    return { status: 'Good', color: 'bg-green-500' };
  };

  const health = getOverallHealth();

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
          ← Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span className="font-medium">{report.scope} Report</span>
              {report.phaseName && <span>• {report.phaseName}</span>}
              {report.weekNumber && <span>• Week {report.weekNumber}, {report.year}</span>}
              <span>• {format(new Date(report.reportDate), 'MMM dd, yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {metric && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Overall Health:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${health.color}`}>
                  <span className="h-2 w-2 bg-white rounded-full"></span>
                  {health.status}
                </span>
              </div>
            )}
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {metric && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SPI */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Schedule Performance</p>
                  <span className="text-2xl">📅</span>
                </div>
                <p className={`text-4xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
                  {metric.schedulePerformanceIndex.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.schedulePerformanceIndex >= 1 ? '✓ On or ahead of schedule' : '⚠ Behind schedule'}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: 1.0+</span>
                    <span>{metric.schedulePerformanceIndex >= 0.95 ? 'Good' : metric.schedulePerformanceIndex >= 0.80 ? 'Warning' : 'At Risk'}</span>
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
                  <p className="text-sm font-medium text-gray-600">Cost Performance</p>
                  <span className="text-2xl">💰</span>
                </div>
                <p className={`text-4xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {metric.costPerformanceIndex.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.costPerformanceIndex >= 1 ? '✓ Under or on budget' : '⚠ Over budget'}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: 1.0+</span>
                    <span>{metric.costPerformanceIndex >= 0.95 ? 'Good' : metric.costPerformanceIndex >= 0.80 ? 'Warning' : 'At Risk'}</span>
                  </div>
                  <ProgressBar
                    progress={Math.min(metric.costPerformanceIndex * 100, 100)}
                    className={metric.costPerformanceIndex >= 0.95 ? 'bg-green-500' : metric.costPerformanceIndex >= 0.80 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
              </Card>

              {/* Pass Rate */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Test Pass Rate</p>
                  <span className="text-2xl">✅</span>
                </div>
                {metric.passRate > 0 ? (
                  <>
                    <p className={`text-4xl font-bold ${getPassRateColor(metric.passRate)}`}>
                      {metric.passRate.toFixed(1)}%
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {metric.passRate >= 95 ? '✓ Excellent quality' : metric.passRate >= 80 ? '⚠ Acceptable' : '⚠ Needs attention'}
                    </p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Target: 95%+</span>
                        <span>{metric.passRate >= 95 ? 'Good' : metric.passRate >= 80 ? 'Warning' : 'At Risk'}</span>
                      </div>
                      <ProgressBar
                        progress={metric.passRate}
                        className={metric.passRate >= 95 ? 'bg-green-500' : metric.passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-gray-400">N/A</p>
                    <p className="mt-2 text-sm text-gray-500">No testing data yet</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Target: 95%+</span>
                        <span className="text-gray-400">--</span>
                      </div>
                      <ProgressBar progress={0} className="bg-gray-300" />
                    </div>
                  </>
                )}
              </Card>

              {/* Delay Rate */}
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Delay Rate</p>
                  <span className="text-2xl">⏱️</span>
                </div>
                <p className={`text-4xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
                  {metric.delayRate.toFixed(1)}%
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {metric.delayRate <= 5 ? '✓ Minimal delays' : metric.delayRate <= 20 ? '⚠ Some delays' : '⚠ Significant delays'}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Target: &lt;5%</span>
                    <span>{metric.delayRate <= 5 ? 'Good' : metric.delayRate <= 20 ? 'Warning' : 'At Risk'}</span>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Earned Value Management (EVM)</h2>
            <p className="text-sm text-gray-500 mb-4">Core metrics for project performance tracking</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-50">
                <p className="text-xs font-medium text-blue-600 mb-1">BAC</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600">Budget at Completion</p>
              </Card>

              <Card className="bg-slate-50">
                <p className="text-xs font-medium text-slate-600 mb-1">PV</p>
                <p className="text-2xl font-bold text-slate-900">
                  {metric.plannedValue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600">Planned Value</p>
              </Card>

              <Card className="bg-green-50">
                <p className="text-xs font-medium text-green-600 mb-1">EV</p>
                <p className="text-2xl font-bold text-green-900">
                  {metric.earnedValue.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">Earned Value</p>
              </Card>

              <Card className="bg-amber-50">
                <p className="text-xs font-medium text-amber-600 mb-1">AC</p>
                <p className="text-2xl font-bold text-amber-900">
                  {metric.actualCost.toFixed(2)}
                </p>
                <p className="text-xs text-amber-600">Actual Cost</p>
              </Card>

              <Card className="bg-purple-50">
                <p className="text-xs font-medium text-purple-600 mb-1">SPI = EV/PV</p>
                <p className={`text-2xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
                  {metric.schedulePerformanceIndex.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">Schedule Index</p>
              </Card>

              <Card className="bg-indigo-50">
                <p className="text-xs font-medium text-indigo-600 mb-1">CPI = EV/AC</p>
                <p className={`text-2xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {metric.costPerformanceIndex.toFixed(2)}
                </p>
                <p className="text-xs text-indigo-600">Cost Index</p>
              </Card>
            </div>
          </div>

          {/* Forecasting Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Forecasting</h2>
            <p className="text-sm text-gray-500 mb-4">"Cuối cùng tốn bao nhiêu?" - Dự báo chi phí hoàn thành</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* EAC Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">Estimate at Completion (EAC)</p>
                  <span className="text-xl">🎯</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {(metric.estimateAtCompletion || (metric.actualCost + (metric.plannedValue - metric.earnedValue) / (metric.costPerformanceIndex || 1))).toFixed(2)} MM
                </p>
                <p className="text-xs text-blue-600 mt-1">= AC + (BAC - EV) / CPI</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>vs BAC: {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}</span>
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
                  <p className="text-sm font-medium text-gray-600">Variance at Completion (VAC)</p>
                  <span className="text-xl">📉</span>
                </div>
                {(() => {
                  const vac = metric.varianceAtCompletion || ((metric.budgetAtCompletion || metric.plannedValue) - (metric.estimateAtCompletion || metric.actualCost));
                  const isPositive = vac >= 0;
                  return (
                    <>
                      <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{vac.toFixed(2)} MM
                      </p>
                      <p className="text-xs text-gray-500 mt-1">= BAC - EAC</p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isPositive ? '✓ Under Budget' : '⚠ Over Budget'}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </Card>

              {/* TCPI Card */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">To Complete Performance Index</p>
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
                      <p className="text-xs text-gray-500 mt-1">= (BAC - EV) / (BAC - AC)</p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isAchievable ? 'bg-green-100 text-green-800' : isHard ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isAchievable ? '✓ Achievable' : isHard ? '⚠ Challenging' : '✗ Very Difficult'}
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
                  <p className="text-sm font-medium text-gray-600">Budget Status</p>
                  <span className="text-xl">💰</span>
                </div>
                {(() => {
                  const eac = metric.estimateAtCompletion || metric.actualCost;
                  const bac = metric.budgetAtCompletion || metric.plannedValue;
                  const diff = eac - bac;
                  const diffPercent = bac > 0 ? (diff / bac) * 100 : 0;

                  let status, color, icon;
                  if (diff <= 0) {
                    status = 'Under Control';
                    color = 'text-green-700';
                    icon = '✓';
                  } else if (diffPercent <= 10) {
                    status = 'Slight Overrun';
                    color = 'text-yellow-700';
                    icon = '⚠';
                  } else {
                    status = 'Over Budget';
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
                          ? `Tiết kiệm được ${Math.abs(diff).toFixed(2)} MM`
                          : `Vượt ${diff.toFixed(2)} MM (${diffPercent.toFixed(1)}%)`}
                      </p>
                    </>
                  );
                })()}
              </Card>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quality Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                </div>
                <p className={`text-3xl font-bold ${metric.passRate > 0 ? getPassRateColor(metric.passRate) : 'text-gray-400'}`}>
                  {metric.passRate > 0 ? `${metric.passRate.toFixed(1)}%` : 'N/A'}
                </p>
                <p className="mt-1 text-xs text-gray-500">Test cases passed</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🐛</span>
                  <p className="text-sm font-medium text-gray-600">Defect Rate</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.defectRate.toFixed(3)}
                </p>
                <p className="mt-1 text-xs text-gray-500">Defects per test case</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⏱️</span>
                  <p className="text-sm font-medium text-gray-600">Delay Rate</p>
                </div>
                <p className={`text-3xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
                  {metric.delayRate.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-gray-500">Tasks delayed</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <p className="text-sm font-medium text-gray-600">Efficiency</p>
                </div>
                <p className={`text-3xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
                  {(metric.costPerformanceIndex * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-gray-500">CPI as percentage</p>
              </Card>
            </div>
          </div>

          {/* Productivity Section - Only for Project reports */}
          {productivity && productivity.byMember && productivity.byMember.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Team Productivity</h2>
              <p className="text-sm text-gray-500 mb-4">Hiệu suất làm việc theo thành viên và vai trò</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white">
                  <p className="text-sm font-medium text-indigo-600">Team Efficiency</p>
                  <p className={`text-3xl font-bold ${productivity.summary.efficiency >= 1 ? 'text-green-600' : productivity.summary.efficiency >= 0.83 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(productivity.summary.efficiency * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">Overall team efficiency</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {productivity.summary.tasksCompleted}/{productivity.summary.tasksTotal}
                  </p>
                  <p className="text-xs text-gray-500">{productivity.summary.completionRate}% completion rate</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">Avg. Effort/Task</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {productivity.summary.avgEffortPerTask.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">Man-hours per task</p>
                </Card>

                <Card>
                  <p className="text-sm font-medium text-gray-600">Variance</p>
                  <p className={`text-3xl font-bold ${productivity.summary.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {productivity.summary.variance > 0 ? '+' : ''}{productivity.summary.variancePercent}%
                  </p>
                  <p className="text-xs text-gray-500">Actual vs Estimated</p>
                </Card>
              </div>

              {/* Member Performance Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="By Member">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Member</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Tasks</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Efficiency</th>
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

                <Card title="By Role">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Members</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Tasks</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Avg/Task</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Efficiency</th>
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

          {/* Summary Insights */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">💡</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Insights</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 ${metric.schedulePerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>•</span>
                    <span>
                      <strong>Schedule:</strong> The project is {metric.schedulePerformanceIndex >= 1 ? 'ahead of' : 'behind'} schedule
                      by approximately {Math.abs((1 - metric.schedulePerformanceIndex) * 100).toFixed(1)}%
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 ${metric.costPerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}>•</span>
                    <span>
                      <strong>Budget:</strong> The project is {metric.costPerformanceIndex >= 1 ? 'under' : 'over'} budget
                      by approximately {Math.abs((1 - metric.costPerformanceIndex) * 100).toFixed(1)}%
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 ${metric.passRate > 0 ? (metric.passRate >= 95 ? 'text-green-600' : metric.passRate >= 80 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`}>•</span>
                    <span>
                      <strong>Quality:</strong>{' '}
                      {metric.passRate > 0
                        ? `Test pass rate is ${metric.passRate.toFixed(1)}% (${metric.passRate >= 95 ? 'excellent' : metric.passRate >= 80 ? 'acceptable' : 'needs improvement'})`
                        : 'No testing data available yet'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 ${metric.delayRate <= 5 ? 'text-green-600' : metric.delayRate <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>•</span>
                    <span>
                      <strong>Delays:</strong> {metric.delayRate.toFixed(1)}% of tasks are delayed
                      ({metric.delayRate <= 5 ? 'minimal impact' : metric.delayRate <= 20 ? 'moderate impact' : 'significant impact'})
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
                            <strong>Forecast:</strong> Dự kiến hoàn thành với {eac.toFixed(2)} MM
                            ({isUnder
                              ? `tiết kiệm ${Math.abs(diff).toFixed(2)} MM so với budget`
                              : `vượt ${diff.toFixed(2)} MM (${((diff / bac) * 100).toFixed(1)}%) so với budget`})
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
            <h2 className="text-xl font-semibold text-gray-900">Commentary & Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add your observations, recommendations, and action items based on the metrics above
            </p>
          </div>
          <Button onClick={() => setShowAddCommentary(true)}>
            ✍️ Add Commentary
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
                        {commentary.type === 'AI Generated' ? '🤖 AI Generated' : '👤 Manual'}
                      </span>
                      {commentary.author && (
                        <span className="text-sm font-medium text-gray-700">by {commentary.author}</span>
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
              <p className="text-gray-600 font-medium mb-2">No commentary yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Add the first commentary to provide insights and recommendations based on the metrics above
              </p>
              <Button onClick={() => setShowAddCommentary(true)} size="sm">
                Add First Commentary
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Commentary Modal */}
      <Modal
        isOpen={showAddCommentary}
        onClose={() => setShowAddCommentary(false)}
        title="Add Commentary"
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
        title="Delete Report"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the report <strong>"{report.title}"</strong>?
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-800 font-medium">Warning</p>
                <p className="text-yellow-700 text-sm mt-1">
                  This action will permanently delete the report and all associated data including:
                </p>
                <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                  <li>All metrics calculated for this report</li>
                  <li>All commentaries and analysis</li>
                </ul>
                <p className="text-yellow-700 text-sm mt-2 font-medium">
                  This action cannot be undone.
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
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteReportMutation.mutate()}
              loading={deleteReportMutation.isPending}
            >
              Delete Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
