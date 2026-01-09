import { createFileRoute, Link } from '@tanstack/react-router';
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
  const [showAddCommentary, setShowAddCommentary] = useState(false);
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

    const spi = metric.schedulePerformanceIndex;
    const cpi = metric.costPerformanceIndex;
    const passRate = metric.passRate;
    const delayRate = metric.delayRate;

    if (spi >= 0.95 && cpi >= 0.95 && passRate >= 95 && delayRate <= 5) {
      return { status: 'Good', color: 'bg-green-500' };
    }
    if (spi < 0.80 || cpi < 0.80 || passRate < 80 || delayRate > 20) {
      return { status: 'At Risk', color: 'bg-red-500' };
    }
    return { status: 'Warning', color: 'bg-yellow-500' };
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
          {metric && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Overall Health:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${health.color}`}>
                <span className="h-2 w-2 bg-white rounded-full"></span>
                {health.status}
              </span>
            </div>
          )}
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

          {/* Detailed Metrics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <p className="text-sm font-medium text-gray-600">Planned Value</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.plannedValue.toFixed(2)} MM
                </p>
                <p className="mt-1 text-xs text-gray-500">Expected cost of work scheduled</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📈</span>
                  <p className="text-sm font-medium text-gray-600">Earned Value</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.earnedValue.toFixed(2)} MM
                </p>
                <p className="mt-1 text-xs text-gray-500">Value of work completed</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💵</span>
                  <p className="text-sm font-medium text-gray-600">Actual Cost</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.actualCost.toFixed(2)} MM
                </p>
                <p className="mt-1 text-xs text-gray-500">Actual cost incurred</p>
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
            </div>
          </div>

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
                    <span className={`mt-0.5 ${metric.passRate >= 95 ? 'text-green-600' : metric.passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>•</span>
                    <span>
                      <strong>Quality:</strong> Test pass rate is {metric.passRate.toFixed(1)}%
                      ({metric.passRate >= 95 ? 'excellent' : metric.passRate >= 80 ? 'acceptable' : 'needs improvement'})
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 ${metric.delayRate <= 5 ? 'text-green-600' : metric.delayRate <= 20 ? 'text-yellow-600' : 'text-red-600'}`}>•</span>
                    <span>
                      <strong>Delays:</strong> {metric.delayRate.toFixed(1)}% of tasks are delayed
                      ({metric.delayRate <= 5 ? 'minimal impact' : metric.delayRate <= 20 ? 'moderate impact' : 'significant impact'})
                    </span>
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
    </div>
  );
}
