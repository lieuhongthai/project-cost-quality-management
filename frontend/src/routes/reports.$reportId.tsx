import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { reportApi, metricsApi, commentaryApi } from '@/services/api';
import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { LoadingSpinner, Button, Modal } from '@/components/common';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ReportKPISection } from '@/views/reports/ReportKPISection';
import { ReportForecastingSection } from '@/views/reports/ReportForecastingSection';
import { ReportInsightsSection } from '@/views/reports/ReportInsightsSection';
import { ReportProductivitySection } from '@/views/reports/ReportProductivitySection';
import { ReportMemberCostSection } from '@/views/reports/ReportMemberCostSection';
import { ReportCommentarySection } from '@/views/reports/ReportCommentarySection';

export const Route = createFileRoute('/reports/$reportId')({
  component: ReportDetail,
});

function ReportDetail() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showAddCommentary, setShowAddCommentary] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const queryClient = useQueryClient();

  const handleExport = async (type: 'excel' | 'pdf' | 'csv') => {
    const setLoading = type === 'excel' ? setIsExportingExcel : type === 'pdf' ? setIsExportingPdf : setIsExportingCsv;
    setLoading(true);
    try {
      const response = type === 'excel'
        ? await reportApi.exportExcel(parseInt(reportId))
        : type === 'pdf'
          ? await reportApi.exportPdf(parseInt(reportId))
          : await reportApi.exportCsv(parseInt(reportId));
      const extMap = { excel: 'xlsx', pdf: 'pdf', csv: 'csv' };
      const mimeMap = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        csv: 'text/csv',
      };
      const blob = new Blob([response.data], { type: mimeMap[type] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.${extMap[type]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Export ${type} error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', parseInt(reportId)],
    queryFn: async () => (await reportApi.getOne(parseInt(reportId))).data,
  });

  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['metrics', parseInt(reportId)],
    queryFn: async () => (await metricsApi.getByReport(parseInt(reportId))).data,
    enabled: !!report,
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics', parseInt(reportId)] }),
  });

  useEffect(() => {
    if (report && !isMetricsLoading && (!metrics || metrics.length === 0) && !calculateMetricsMutation.isPending) {
      calculateMetricsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, metrics?.length, isMetricsLoading]);

  const { data: commentaries } = useQuery({
    queryKey: ['commentaries', parseInt(reportId)],
    queryFn: async () => (await commentaryApi.getByReport(parseInt(reportId))).data,
    enabled: !!report,
  });

  const deleteReportMutation = useMutation({
    mutationFn: () => reportApi.delete(parseInt(reportId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate({ to: '/reports' });
    },
  });

  const hasSnapshot = report?.snapshotData && report?.snapshotAt;

  const { data: realtimeProductivity } = useQuery({
    queryKey: ['productivity', report?.projectId],
    queryFn: async () => {
      if (!report?.projectId) return null;
      return (await metricsApi.getProjectProductivity(report.projectId)).data;
    },
    enabled: !!report?.projectId && report?.scope === 'Project' && !hasSnapshot,
  });

  const { data: realtimeMemberCost } = useQuery({
    queryKey: ['memberCost', report?.projectId],
    queryFn: async () => {
      if (!report?.projectId) return null;
      return (await metricsApi.getProjectMemberCost(report.projectId)).data;
    },
    enabled: !!report?.projectId && report?.scope === 'Project' && !hasSnapshot,
  });

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

  const getOverallHealth = () => {
    if (!metric) return { status: t('common.unknown'), color: 'bg-gray-500' };
    const spi = metric.schedulePerformanceIndex;
    const cpi = metric.costPerformanceIndex;
    if (cpi < 0.83 || spi < 0.8) return { status: t('metrics.atRisk'), color: 'bg-red-500' };
    if ((cpi >= 0.83 && cpi < 1.0) || (spi >= 0.8 && spi < 0.95)) {
      return { status: t('metrics.warning'), color: 'bg-yellow-500' };
    }
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
        <Link to="/reports" className="text-sm text-primary hover:text-primary-dark mb-2 inline-block">
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
            {hasSnapshot ? (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('report.snapshot')}: {format(new Date(report.snapshotAt!), 'dd/MM/yyyy HH:mm')}
                </span>
                <span className="text-gray-400 text-xs">({t('report.snapshotNote')})</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('report.realtime')}
                </span>
                <span className="text-gray-400 text-xs">({t('report.realtimeNote')})</span>
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
            <Button variant="secondary" onClick={() => handleExport('excel')} disabled={isExportingExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5 inline" />
              {isExportingExcel ? t('report.exporting') : t('report.exportExcel')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={isExportingPdf}>
              <FileText className="w-4 h-4 mr-1.5 inline" />
              {isExportingPdf ? t('report.exporting') : t('report.exportPdf')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('csv')} disabled={isExportingCsv}>
              <FileDown className="w-4 h-4 mr-1.5 inline" />
              {isExportingCsv ? t('report.exporting') : t('report.exportCsv')}
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              {t('report.delete')}
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Sections */}
      {metric && (
        <>
          <ReportKPISection metric={metric} />
          <ReportForecastingSection metric={metric} />
          <ReportProductivitySection productivity={productivity} />
          <ReportMemberCostSection memberCost={memberCost} />
          <ReportInsightsSection metric={metric} />
        </>
      )}

      {/* Commentary */}
      <ReportCommentarySection
        commentaries={commentaries}
        reportId={parseInt(reportId)}
        showAddCommentary={showAddCommentary}
        setShowAddCommentary={setShowAddCommentary}
      />

      {/* Delete Confirmation Modal */}
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
                <p className="text-yellow-700 text-sm mt-1">{t('report.deleteWarning')}</p>
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
