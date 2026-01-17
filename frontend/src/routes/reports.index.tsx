import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { reportApi } from '../services/api'
import { format } from 'date-fns'
import { Modal } from '../components/common'
import { ReportForm } from '../components/forms'

export const Route = createFileRoute('/reports/')({
  component: ReportsList,
})

function ReportsList() {
  const [showGenerateReport, setShowGenerateReport] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await reportApi.getAll()
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all project reports with metrics and commentary
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowGenerateReport(true)}
          >
            Generate Report
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4">
        {reports
          ?.slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((report) => (
          <div key={report.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {report.scope} Report
                  {report.phaseName && ` - ${report.phaseName}`}
                  {report.weekNumber && ` - Week ${report.weekNumber}, ${report.year}`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Report Date: {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                  {report.createdAt && (
                    <span className="ml-2">• Created: {format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: report.id.toString() }}
                  className="btn btn-secondary text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>

            {report.metrics && report.metrics.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">SPI</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {report.metrics[0].schedulePerformanceIndex.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">CPI</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {report.metrics[0].costPerformanceIndex.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {report.metrics[0].passRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Defect Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {report.metrics[0].defectRate.toFixed(3)}
                  </p>
                </div>
              </div>
            )}

            {report.commentaries && report.commentaries.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">
                  Latest Commentary ({report.commentaries[0].type})
                </p>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {report.commentaries[0].content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {reports?.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500">No reports found. Generate your first report to get started.</p>
        </div>
      )}

      {/* Generate Report Modal */}
      <Modal
        isOpen={showGenerateReport}
        onClose={() => setShowGenerateReport(false)}
        title="Generate Report"
      >
        <ReportForm
          onSuccess={() => setShowGenerateReport(false)}
          onCancel={() => setShowGenerateReport(false)}
        />
      </Modal>
    </div>
  )
}
