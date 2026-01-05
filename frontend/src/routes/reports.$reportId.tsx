import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { reportApi, metricsApi, commentaryApi } from '@/services/api';
import { Card, LoadingSpinner, Button } from '@/components/common';
import { format } from 'date-fns';

export const Route = createFileRoute('/reports/$reportId')({
  component: ReportDetail,
});

function ReportDetail() {
  const { reportId } = Route.useParams();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', parseInt(reportId)],
    queryFn: async () => {
      const response = await reportApi.getOne(parseInt(reportId));
      return response.data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', parseInt(reportId)],
    queryFn: async () => {
      const response = await metricsApi.getByReport(parseInt(reportId));
      return response.data;
    },
    enabled: !!report,
  });

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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
              ← Back to Reports
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>{report.scope} Report</span>
              {report.phaseName && <span>• {report.phaseName}</span>}
              {report.weekNumber && <span>• Week {report.weekNumber}, {report.year}</span>}
              <span>• {format(new Date(report.reportDate), 'MMM dd, yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      {metrics && metrics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Schedule Performance Index</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].schedulePerformanceIndex.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {metrics[0].schedulePerformanceIndex >= 1 ? 'On or ahead of schedule' : 'Behind schedule'}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Cost Performance Index</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].costPerformanceIndex.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {metrics[0].costPerformanceIndex >= 1 ? 'Under or on budget' : 'Over budget'}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Delay Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].delayRate.toFixed(1)}%
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Pass Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].passRate.toFixed(1)}%
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Defect Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].defectRate.toFixed(3)}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Planned Value (PV)</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].plannedValue.toFixed(2)}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Earned Value (EV)</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].earnedValue.toFixed(2)}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Actual Cost (AC)</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics[0].actualCost.toFixed(2)}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Commentaries Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Commentary</h2>
          <Button size="sm">Add Commentary</Button>
        </div>

        {commentaries && commentaries.length > 0 ? (
          <div className="space-y-4">
            {commentaries.map((commentary) => (
              <Card key={commentary.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        commentary.type === 'AI Generated'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {commentary.type}
                      </span>
                      {commentary.author && (
                        <span className="text-sm text-gray-500">by {commentary.author}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        • {format(new Date(commentary.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="text-xs text-gray-400">
                        • v{commentary.version}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{commentary.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No commentary yet. Add the first commentary to this report.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
