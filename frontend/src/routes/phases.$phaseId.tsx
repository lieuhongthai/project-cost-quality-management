import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { phaseApi, effortApi, testingApi, reviewApi, screenFunctionApi, phaseScreenFunctionApi, projectApi, memberApi } from "@/services/api";
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  ProgressBar,
  Button,
  Modal,
  EmptyState,
} from "@/components/common";
import { EffortUnitSelector } from "@/components/common/EffortUnitSelector";
import { EffortForm, TestingForm, ReviewForm, PhaseScreenFunctionForm } from "@/components/forms";
import {
  ProgressChart,
  TestingQualityChart,
  PhaseEfficiencyChart,
  PhaseStatusPieChart,
  PhaseProgressOverview,
} from "@/components/charts";
import { format } from "date-fns";
import type { PhaseScreenFunction, EffortUnit, PhaseScreenFunctionStatus, Review } from "@/types";
import {
  convertEffort,
  formatEffort,
  EFFORT_UNIT_LABELS,
  DEFAULT_WORK_SETTINGS,
} from "@/utils/effortUtils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/phases/$phaseId")({
  component: PhaseDetail,
});

function PhaseDetail() {
  const { t } = useTranslation();
  const { phaseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"charts" | "efforts" | "testing" | "review" | "screen-functions">("screen-functions");
  const [showAddEffort, setShowAddEffort] = useState(false);
  const [showAddTesting, setShowAddTesting] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [editingEffort, setEditingEffort] = useState<any>(null);
  const [editingTesting, setEditingTesting] = useState<any>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editingPSF, setEditingPSF] = useState<PhaseScreenFunction | null>(null);
  const [showLinkScreenFunction, setShowLinkScreenFunction] = useState(false);
  const [selectedSFIds, setSelectedSFIds] = useState<number[]>([]);
  const [effortUnit, setEffortUnit] = useState<EffortUnit>(() => {
    const stored = localStorage.getItem(`effortUnit.phase.${phaseId}`) as EffortUnit | null;
    return stored || 'man-hour';
  });
  const [effortUnitReady, setEffortUnitReady] = useState(false);
  const [workSettings, setWorkSettings] = useState(DEFAULT_WORK_SETTINGS);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<{
    assigneeId: number | null;
    status: PhaseScreenFunctionStatus;
    progress: number;
    estimatedEffort: number;
    actualEffort: number;
    note: string;
  } | null>(null);

  const { data: phase, isLoading } = useQuery({
    queryKey: ["phase", parseInt(phaseId)],
    queryFn: async () => {
      const response = await phaseApi.getOne(parseInt(phaseId));
      return response.data;
    },
  });

  // Get project details for breadcrumb
  const { data: project } = useQuery({
    queryKey: ["project", phase?.projectId],
    queryFn: async () => {
      if (!phase?.projectId) return null;
      const response = await projectApi.getOne(phase.projectId);
      return response.data;
    },
    enabled: !!phase?.projectId,
  });

  const { data: efforts } = useQuery({
    queryKey: ["efforts", parseInt(phaseId)],
    queryFn: async () => {
      const response = await effortApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: effortSummary } = useQuery({
    queryKey: ["effort-summary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await effortApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: testing } = useQuery({
    queryKey: ["testing", parseInt(phaseId)],
    queryFn: async () => {
      const response = await testingApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: testingSummary } = useQuery({
    queryKey: ["testing-summary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await testingApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", parseInt(phaseId)],
    queryFn: async () => {
      const response = await reviewApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: reviewSummary } = useQuery({
    queryKey: ["review-summary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await reviewApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  // Screen/Function queries
  const { data: phaseScreenFunctions } = useQuery({
    queryKey: ["phaseScreenFunctions", parseInt(phaseId)],
    queryFn: async () => {
      const response = await phaseScreenFunctionApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: psfSummary } = useQuery({
    queryKey: ["phaseScreenFunctionSummary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await phaseScreenFunctionApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", phase?.projectId],
    queryFn: async () => {
      if (!phase?.projectId) return [];
      const response = await memberApi.getByProject(phase.projectId);
      return response.data;
    },
    enabled: !!phase?.projectId,
  });

  // Get all screen functions for the project (to show unlinked ones)
  const { data: allScreenFunctions } = useQuery({
    queryKey: ["projectScreenFunctions", phase?.projectId],
    queryFn: async () => {
      if (!phase?.projectId) return [];
      const response = await screenFunctionApi.getByProject(phase.projectId);
      return response.data;
    },
    enabled: !!phase?.projectId,
  });

  // Get project settings for effort conversion
  const { data: projectSettings } = useQuery({
    queryKey: ["projectSettings", phase?.projectId],
    queryFn: async () => {
      if (!phase?.projectId) return null;
      const response = await projectApi.getSettings(phase.projectId);
      return response.data;
    },
    enabled: !!phase?.projectId,
  });

  // Sync settings when project settings are loaded
  useEffect(() => {
    if (projectSettings) {
      const storedEffortUnit = localStorage.getItem(`effortUnit.phase.${phaseId}`) as EffortUnit | null;
      setWorkSettings({
        workingHoursPerDay: projectSettings.workingHoursPerDay || DEFAULT_WORK_SETTINGS.workingHoursPerDay,
        workingDaysPerMonth: projectSettings.workingDaysPerMonth || DEFAULT_WORK_SETTINGS.workingDaysPerMonth,
        defaultEffortUnit: projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
      });
      setEffortUnit(
        storedEffortUnit || projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
      );
      setEffortUnitReady(true);
    }
  }, [projectSettings, phaseId]);

  useEffect(() => {
    if (phaseId && effortUnitReady) {
      localStorage.setItem(`effortUnit.phase.${phaseId}`, effortUnit);
    }
  }, [effortUnit, effortUnitReady, phaseId]);

  // Helper to convert effort to display unit
  const displayEffort = (value: number, sourceUnit: EffortUnit = 'man-hour') => {
    const converted = convertEffort(value, sourceUnit, effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
  };

  const statusLabels: Record<PhaseScreenFunctionStatus, string> = {
    'Not Started': t('screenFunction.statusNotStarted'),
    'In Progress': t('screenFunction.statusInProgress'),
    'Completed': t('screenFunction.statusCompleted'),
    'Skipped': t('screenFunction.statusSkipped'),
  };

  const typeLabels: Record<string, string> = {
    Screen: t('screenFunction.typeScreen'),
    Function: t('screenFunction.typeFunction'),
  };

  const priorityLabels: Record<string, string> = {
    High: t('screenFunction.priorityHigh'),
    Medium: t('screenFunction.priorityMedium'),
    Low: t('screenFunction.priorityLow'),
  };

  const complexityLabels: Record<string, string> = {
    Simple: t('screenFunction.complexitySimple'),
    Medium: t('screenFunction.complexityMedium'),
    Complex: t('screenFunction.complexityComplex'),
  };

  // Mutations
  const linkMutation = useMutation({
    mutationFn: (data: { phaseId: number; items: Array<{ screenFunctionId: number; estimatedEffort?: number }> }) =>
      phaseScreenFunctionApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctions", parseInt(phaseId)] });
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctionSummary", parseInt(phaseId)] });
      // Invalidate phase to update Progress and Actual Effort in header
      queryClient.invalidateQueries({ queryKey: ["phase", parseInt(phaseId)] });
      if (phase?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project", phase.projectId] });
      }
      setShowLinkScreenFunction(false);
      setSelectedSFIds([]);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => phaseScreenFunctionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctions", parseInt(phaseId)] });
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctionSummary", parseInt(phaseId)] });
      // Invalidate phase to update Progress and Actual Effort in header
      queryClient.invalidateQueries({ queryKey: ["phase", parseInt(phaseId)] });
      if (phase?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project", phase.projectId] });
      }
    },
  });

  const updateInlineMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<PhaseScreenFunction> }) =>
      phaseScreenFunctionApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctions", parseInt(phaseId)] });
      queryClient.invalidateQueries({ queryKey: ["phaseScreenFunctionSummary", parseInt(phaseId)] });
      queryClient.invalidateQueries({ queryKey: ["phase", parseInt(phaseId)] });
      setInlineEditId(null);
      setInlineDraft(null);
    },
  });

  // Get unlinked screen functions
  const linkedSFIds = phaseScreenFunctions?.map(psf => psf.screenFunctionId) || [];
  const unlinkedScreenFunctions = allScreenFunctions?.filter(sf => !linkedSFIds.includes(sf.id)) || [];

  const startInlineEdit = (psf: PhaseScreenFunction) => {
    setInlineEditId(psf.id);
    setInlineDraft({
      assigneeId: psf.assigneeId ?? psf.assignee?.id ?? null,
      status: psf.status,
      progress: psf.progress,
      estimatedEffort: psf.estimatedEffort ?? 0,
      actualEffort: psf.actualEffort ?? 0,
      note: psf.note ?? '',
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineDraft(null);
  };

  const saveInlineEdit = (psfId: number) => {
    if (!inlineDraft) return;
    updateInlineMutation.mutate({
      id: psfId,
      payload: {
        assigneeId: inlineDraft.assigneeId ?? undefined,
        status: inlineDraft.status,
        progress: inlineDraft.progress,
        estimatedEffort: inlineDraft.estimatedEffort,
        actualEffort: inlineDraft.actualEffort,
        note: inlineDraft.note,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('phase.detail.notFound')}</p>
      </div>
    );
  }

  // Prepare chart data
  const effortChartData =
    efforts?.map((e) => ({
      week: t('phase.detail.weekLabel', { week: e.weekNumber }),
      planned: e.plannedEffort,
      actual: e.actualEffort,
      progress: e.progress,
    })) || [];

  const testingChartData =
    testing?.map((test) => ({
      week: t('phase.detail.weekLabel', { week: test.weekNumber }),
      passed: test.passedTestCases,
      failed: test.failedTestCases,
      passRate: test.passRate,
    })) || [];

  const tabs = [
    { id: "screen-functions" as const, name: t('phase.detail.tabs.screenFunctions') },
    { id: "charts" as const, name: t('phase.detail.tabs.charts') },
    { id: "testing" as const, name: t('phase.detail.tabs.testing') },
    { id: "review" as const, name: t('phase.detail.tabs.review') },
    // Hidden: Efforts tab can be re-enabled by uncommenting the line below
    // { id: "efforts" as const, name: t('phase.detail.tabs.efforts') },
  ];

  const handleLinkScreenFunctions = () => {
    if (selectedSFIds.length === 0) return;
    linkMutation.mutate({
      phaseId: parseInt(phaseId),
      items: selectedSFIds.map(id => ({ screenFunctionId: id })),
    });
  };

  const toggleSFSelection = (sfId: number) => {
    setSelectedSFIds(prev =>
      prev.includes(sfId)
        ? prev.filter(id => id !== sfId)
        : [...prev, sfId]
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm mb-4">
        <Link
          to="/projects"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {t('nav.projects')}
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {project ? (
          <Link
            to="/projects/$projectId"
            params={{ projectId: String(phase.projectId) }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {project.name}
          </Link>
        ) : (
          <span className="text-gray-400">{t('common.loading')}</span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{phase.name}</span>
      </nav>

      {/* Back Button */}
      <div className="mb-4">
        <Link
          to="/projects/$projectId"
          params={{ projectId: String(phase.projectId) }}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors group"
        >
          <svg
            className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('phase.detail.backToProject', {
            project: project?.name || t('report.scopeProject'),
          })}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{phase.name}</h1>
            <p className="mt-1 text-gray-600">{t('phase.detail.subtitle')}</p>
          </div>
          {project && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('report.scopeProject')}</p>
              <Link
                to="/projects/$projectId"
                params={{ projectId: String(phase.projectId) }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {project.name}
              </Link>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6">
          {/* Effort Unit Selector */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <span className="text-sm text-gray-500">{t('phase.detail.displayEffortIn')}</span>
            <EffortUnitSelector value={effortUnit} onChange={setEffortUnit} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Card>
              <p className="text-sm text-gray-500">{t('phase.status')}</p>
              <div className="mt-1">
                <StatusBadge status={phase.status as any} />
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('phase.progress')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {phase.progress.toFixed(1)}%
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('phase.estimatedEffort')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(phase.estimatedEffort, 'man-month')}{" "}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('phase.actualEffort')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(phase.actualEffort, 'man-month')}{" "}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "efforts" && (
        <div className="space-y-6">
          {effortSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Card>
                <p className="text-sm text-gray-500">{t('phase.detail.efforts.totalPlanned')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(effortSummary.totalPlanned, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('phase.detail.efforts.totalActual')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(effortSummary.totalActual, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('common.variance')}</p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    effortSummary.variance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {effortSummary.variance > 0 ? "+" : ""}
                  {displayEffort(effortSummary.variance, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
            </div>
          )}

          {effortChartData.length > 0 && (
            <Card title={t('phase.detail.efforts.trend')}>
              <ProgressChart data={effortChartData} />
            </Card>
          )}

          <Card
            title={t('phase.detail.efforts.weekly')}
            actions={
              <Button size="sm" onClick={() => setShowAddEffort(true)}>
                {t('phase.detail.efforts.add')}
              </Button>
            }
          >
            {efforts && efforts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.efforts.week')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.efforts.dateRange')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.efforts.planned')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.efforts.actual')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('phase.progress')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {efforts.map((effort) => (
                      <tr key={effort.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {t('phase.detail.efforts.weekLabel', { week: effort.weekNumber })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(effort.weekStartDate), "MMM dd")} -{" "}
                          {format(new Date(effort.weekEndDate), "MMM dd")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {displayEffort(effort.plannedEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {displayEffort(effort.actualEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {effort.progress.toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingEffort(effort)}
                          >
                            {t('common.edit')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('phase.detail.efforts.emptyTitle')}
                description={t('phase.detail.efforts.emptyDescription')}
                action={
                  <Button onClick={() => setShowAddEffort(true)}>
                    {t('phase.detail.efforts.addFirst')}
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "testing" && (
        <div className="space-y-6">
          {testingSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <Card>
                <p className="text-sm text-gray-500">{t('testing.totalTestCases')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.totalTestCases}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('testing.passRate')}</p>
                <p className="mt-1 text-2xl font-semibold text-green-600">
                  {testingSummary.overallPassRate.toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('testing.defects')}</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">
                  {testingSummary.totalDefects}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('testing.defectRate')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.overallDefectRate.toFixed(3)}
                </p>
              </Card>
            </div>
          )}

          {testingChartData.length > 0 && (
            <Card title={t('phase.detail.testing.qualityTrend')}>
              <TestingQualityChart data={testingChartData} />
            </Card>
          )}

          <Card
            title={t('phase.detail.testing.weekly')}
            actions={
              <Button size="sm" onClick={() => setShowAddTesting(true)}>
                {t('phase.detail.testing.add')}
              </Button>
            }
          >
            {testing && testing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.testing.week')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('phase.detail.testing.totalCases')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('testing.passed')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('testing.failed')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('testing.passRate')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('testing.defects')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('common.status')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testing.map((test) => (
                      <tr key={test.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {t('phase.detail.testing.weekLabel', { week: test.weekNumber })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.totalTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                          {test.passedTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600">
                          {test.failedTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.passRate.toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.defectsDetected}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <StatusBadge status={test.status as any} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingTesting(test)}
                          >
                            {t('common.edit')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('phase.detail.testing.emptyTitle')}
                description={t('phase.detail.testing.emptyDescription')}
                action={
                  <Button onClick={() => setShowAddTesting(true)}>
                    {t('phase.detail.testing.addFirst')}
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "review" && (
        <div className="space-y-6">
          {reviewSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <p className="text-sm text-gray-500">{t('review.totalReviewEffort')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(reviewSummary.totalReviewEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.totalReviewRounds')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {reviewSummary.totalReviewRounds}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.averageReviewRounds')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {reviewSummary.averageReviewRounds.toFixed(2)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.firstTimePassRate')}</p>
                <p className="mt-1 text-2xl font-semibold text-green-600">
                  {reviewSummary.firstTimePassRate.toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.reviewEffortRatio')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(reviewSummary.reviewEffortRatio * 100).toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.issueDensity')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {reviewSummary.issueDensity.toFixed(3)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('review.totalDefects')}</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">
                  {reviewSummary.totalDefects}
                </p>
              </Card>
            </div>
          )}

          <Card
            title={t('review.title')}
            actions={(
              <Button size="sm" onClick={() => setShowAddReview(true)}>
                {t('review.add')}
              </Button>
            )}
          >
            {reviews && reviews.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        {t('review.screenFunction')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.reviewRound')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.reviewDate')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.reviewer')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.reviewEffort')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.defectsFound')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('review.note')}
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {review.phaseScreenFunction?.screenFunction?.name || t('common.unknown')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {t('review.roundLabel', { round: review.reviewRound })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(review.reviewDate), "MMM dd, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {review.reviewer?.name || t('review.form.unassigned')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {displayEffort(review.reviewEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {review.defectsFound}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {review.note || t('common.notAvailable')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Button size="sm" variant="secondary" onClick={() => setEditingReview(review)}>
                            {t('common.edit')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('review.emptyTitle')}
                description={t('review.emptyDescription')}
                action={(
                  <Button onClick={() => setShowAddReview(true)}>
                    {t('review.addFirst')}
                  </Button>
                )}
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "screen-functions" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {psfSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
              <Card>
                <p className="text-sm text-gray-500">{t('phase.detail.screenFunctions.linkedItems')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{psfSummary.total}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('phase.estimatedEffort')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(psfSummary.totalEstimated, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('phase.actualEffort')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(psfSummary.totalActual, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
                {psfSummary.variance !== 0 && (
                  <p className={`text-xs mt-1 ${psfSummary.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {psfSummary.variance > 0 ? '+' : ''}{displayEffort(psfSummary.variance, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                  </p>
                )}
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('phase.progress')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(psfSummary.progress ?? 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('phase.detail.screenFunctions.completedCount', {
                    completed: psfSummary.completedCount ?? psfSummary.byStatus?.Completed ?? 0,
                    total: psfSummary.activeCount ?? psfSummary.total,
                  })}
                </p>
                <ProgressBar progress={psfSummary.progress ?? 0} />
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('screenFunction.averageProgress')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{psfSummary.avgProgress.toFixed(1)}%</p>
                <ProgressBar progress={psfSummary.avgProgress} />
              </Card>
            </div>
          )}

          {/* Status breakdown */}
          {psfSummary && psfSummary.total > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-400">{psfSummary.byStatus['Not Started']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusNotStarted')}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{psfSummary.byStatus['In Progress']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusInProgress')}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{psfSummary.byStatus['Completed']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusCompleted')}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">{psfSummary.byStatus['Skipped']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusSkipped')}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <Card
            title={t('phase.detail.screenFunctions.title')}
            actions={
              <Button size="sm" onClick={() => setShowLinkScreenFunction(true)}>
                {t('phase.detail.screenFunctions.link')}
              </Button>
            }
          >
            {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">{t('screenFunction.name')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.type')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.assignee')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.status')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.progress')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.estimatedEffort')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.actualEffort')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.variance')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {phaseScreenFunctions.map((psf) => {
                      const isEditing = inlineEditId === psf.id;
                      const draft = isEditing ? inlineDraft : null;
                      const estimatedEffortValue = draft ? draft.estimatedEffort : psf.estimatedEffort;
                      const actualEffortValue = draft ? draft.actualEffort : psf.actualEffort;
                      const progressValue = draft ? draft.progress : psf.progress;
                      const statusValue = draft ? draft.status : psf.status;
                      const variance = actualEffortValue - estimatedEffortValue;
                      return (
                        <tr key={psf.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                            <p className="font-medium text-gray-900">{psf.screenFunction?.name || t('common.unknown')}</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft?.note ?? ''}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({ ...prev, note: e.target.value }) : prev)}
                                placeholder={t('phaseScreenFunction.form.notePlaceholder')}
                                className="mt-2 w-full max-w-xs rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                              />
                            ) : (
                              psf.note && (
                                <p className="text-gray-500 text-xs truncate max-w-xs">{psf.note}</p>
                              )
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              psf.screenFunction?.type === 'Screen' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {psf.screenFunction?.type ? typeLabels[psf.screenFunction.type] : t('common.notAvailable')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {isEditing ? (
                              <select
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                value={draft?.assigneeId ?? ''}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({
                                  ...prev,
                                  assigneeId: e.target.value ? Number(e.target.value) : null,
                                }) : prev)}
                              >
                                <option value="">{t('phase.detail.screenFunctions.unassigned')}</option>
                                {members?.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name} ({member.role})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              psf.assignee ? (
                                <div>
                                  <p className="font-medium text-gray-900">{psf.assignee.name}</p>
                                  <p className="text-xs text-gray-500">{psf.assignee.role}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">{t('phase.detail.screenFunctions.unassigned')}</span>
                              )
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {isEditing ? (
                              <select
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                value={statusValue}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({
                                  ...prev,
                                  status: e.target.value as PhaseScreenFunctionStatus,
                                }) : prev)}
                              >
                                {Object.keys(statusLabels).map((status) => (
                                  <option key={status} value={status}>
                                    {statusLabels[status as PhaseScreenFunctionStatus]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-xs rounded ${
                                statusValue === 'Completed' ? 'bg-green-100 text-green-800' :
                                statusValue === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                statusValue === 'Skipped' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {statusLabels[statusValue] ?? statusValue}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={progressValue}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({
                                  ...prev,
                                  progress: Number(e.target.value),
                                }) : prev)}
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <div className="w-20">
                                <ProgressBar progress={progressValue} showLabel />
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={estimatedEffortValue}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({
                                  ...prev,
                                  estimatedEffort: Number(e.target.value),
                                }) : prev)}
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <>
                                {displayEffort(estimatedEffortValue, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                              </>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={actualEffortValue}
                                onChange={(e) => setInlineDraft((prev) => prev ? ({
                                  ...prev,
                                  actualEffort: Number(e.target.value),
                                }) : prev)}
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <>
                                {displayEffort(actualEffortValue, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                              </>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={variance > 0 ? 'text-red-600' : 'text-green-600'}>
                              {variance > 0 ? '+' : ''}{displayEffort(variance, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => saveInlineEdit(psf.id)}
                                    loading={updateInlineMutation.isPending}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={cancelInlineEdit}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => startInlineEdit(psf)}
                                  >
                                    {t('common.quickEdit')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setEditingPSF(psf)}
                                  >
                                    {t('common.edit')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => {
                                      if (confirm(t('phase.detail.screenFunctions.unlinkConfirm'))) {
                                        unlinkMutation.mutate(psf.id);
                                      }
                                    }}
                                  >
                                    {t('phase.detail.screenFunctions.unlink')}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('phase.detail.screenFunctions.emptyTitle')}
                description={t('phase.detail.screenFunctions.emptyDescription')}
                action={
                  <Button onClick={() => setShowLinkScreenFunction(true)}>
                    {t('phase.detail.screenFunctions.link')}
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "charts" && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-gray-500">{t('phase.detail.charts.efficiencyLabel')}</p>
              <div className="mt-1">
                {phase.actualEffort > 0 ? (
                  <>
                    {(() => {
                      const expectedEffort = phase.estimatedEffort * (phase.progress / 100);
                      const efficiency = expectedEffort > 0
                        ? Math.round((expectedEffort / phase.actualEffort) * 100)
                        : 0;
                      const isGood = efficiency >= 100;
                      const isWarning = efficiency >= 83 && efficiency < 100;
                      return (
                        <>
                          <p className={`text-3xl font-bold ${
                            isGood ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {efficiency}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {isGood
                              ? t('phase.detail.charts.efficiencyGood')
                              : isWarning
                                ? t('phase.detail.charts.efficiencyWarning')
                                : t('phase.detail.charts.efficiencyPoor')}
                          </p>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-2xl font-semibold text-gray-400">{t('phase.detail.charts.noData')}</p>
                )}
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('phase.detail.charts.completed')}</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">
                {psfSummary?.byStatus?.Completed ?? 0}/{psfSummary?.total ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('screenFunction.title')}</p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('phase.detail.charts.overallProgress')}</p>
              <p className="mt-1 text-3xl font-bold text-primary-600">
                {phase.progress.toFixed(1)}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, phase.progress)}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Charts Row 1: Status Distribution & Progress Overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={t('phase.detail.charts.statusDistribution')}>
              {psfSummary ? (
                <PhaseStatusPieChart data={psfSummary.byStatus} />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  {t('phase.detail.charts.noData')}
                </div>
              )}
            </Card>

            <Card title={t('phase.detail.charts.progressByItem')}>
              {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
                <PhaseProgressOverview
                  data={phaseScreenFunctions.map(psf => ({
                    name: psf.screenFunction?.name || t('common.unknown'),
                    progress: psf.progress,
                    status: psf.status,
                  }))}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  {t('phase.detail.charts.noScreenFunctionData')}
                </div>
              )}
            </Card>
          </div>

          {/* Charts Row 2: Efficiency Comparison */}
          <Card title={t('phase.detail.charts.effortComparisonTitle')}>
            <p className="text-sm text-gray-500 mb-4">
              {t('phase.detail.charts.effortComparisonDescription')}
            </p>
            {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
              <PhaseEfficiencyChart
                data={phaseScreenFunctions.map(psf => ({
                  name: psf.screenFunction?.name || t('common.unknown'),
                  estimated: psf.estimatedEffort,
                  actual: psf.actualEffort,
                  progress: psf.progress,
                }))}
                effortLabel={EFFORT_UNIT_LABELS[effortUnit]}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                {t('phase.detail.charts.noScreenFunctionData')}
              </div>
            )}
          </Card>

          {/* Testing Quality Chart (if testing data exists) */}
          {testingChartData.length > 0 && (
            <Card title={t('phase.detail.charts.testingQualityByWeek')}>
              <TestingQualityChart data={testingChartData} />
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showAddEffort || !!editingEffort}
        onClose={() => {
          setShowAddEffort(false);
          setEditingEffort(null);
        }}
        title={editingEffort ? t('phase.detail.efforts.editRecord') : t('phase.detail.efforts.addRecord')}
      >
        <EffortForm
          stageId={parseInt(phaseId)}
          effort={editingEffort}
          effortUnit={effortUnit}
          workSettings={workSettings}
          onSuccess={() => {
            setShowAddEffort(false);
            setEditingEffort(null);
          }}
          onCancel={() => {
            setShowAddEffort(false);
            setEditingEffort(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showAddTesting || !!editingTesting}
        onClose={() => {
          setShowAddTesting(false);
          setEditingTesting(null);
        }}
        title={editingTesting ? t('phase.detail.testing.editRecord') : t('phase.detail.testing.addRecord')}
      >
        <TestingForm
          stageId={parseInt(phaseId)}
          testing={editingTesting}
          onSuccess={() => {
            setShowAddTesting(false);
            setEditingTesting(null);
          }}
          onCancel={() => {
            setShowAddTesting(false);
            setEditingTesting(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showAddReview || !!editingReview}
        onClose={() => {
          setShowAddReview(false);
          setEditingReview(null);
        }}
        title={editingReview ? t('review.editRecord') : t('review.addRecord')}
      >
        <ReviewForm
          phaseId={parseInt(phaseId)}
          review={editingReview || undefined}
          phaseScreenFunctions={phaseScreenFunctions || []}
          members={members || []}
          onSuccess={() => {
            setShowAddReview(false);
            setEditingReview(null);
          }}
          onCancel={() => {
            setShowAddReview(false);
            setEditingReview(null);
          }}
        />
      </Modal>

      {/* Link Screen/Function Modal */}
      <Modal
        isOpen={showLinkScreenFunction}
        onClose={() => {
          setShowLinkScreenFunction(false);
          setSelectedSFIds([]);
        }}
        title={t('phase.detail.screenFunctions.linkModalTitle')}
        size="lg"
      >
        <div className="space-y-4">
          {unlinkedScreenFunctions.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">
                {t('phase.detail.screenFunctions.linkModalDescription')}
              </p>
              <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
                {unlinkedScreenFunctions.map((sf) => (
                  <label
                    key={sf.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSFIds.includes(sf.id)}
                      onChange={() => toggleSFSelection(sf.id)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">{sf.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.type === 'Screen' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {typeLabels[sf.type]}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.priority === 'High' ? 'bg-red-100 text-red-800' :
                          sf.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {priorityLabels[sf.priority]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {complexityLabels[sf.complexity]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {t('phase.detail.screenFunctions.linkModalTotalEffort', {
                        effort: `${displayEffort(sf.estimatedEffort, 'man-hour')} ${EFFORT_UNIT_LABELS[effortUnit]}`,
                      })}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowLinkScreenFunction(false);
                    setSelectedSFIds([]);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleLinkScreenFunctions}
                  disabled={selectedSFIds.length === 0 || linkMutation.isPending}
                  loading={linkMutation.isPending}
                >
                  {selectedSFIds.length > 0
                    ? t('phase.detail.screenFunctions.linkWithCount', { count: selectedSFIds.length })
                    : t('phase.detail.screenFunctions.link')}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title={t('phase.detail.screenFunctions.noUnlinkedTitle')}
              description={t('phase.detail.screenFunctions.noUnlinkedDescription')}
            />
          )}
        </div>
      </Modal>

      {/* Edit Phase Screen Function Modal */}
      <Modal
        isOpen={!!editingPSF}
        onClose={() => setEditingPSF(null)}
        title={t('phase.detail.screenFunctions.updateEffortDetails')}
      >
        {editingPSF && phase && (
          <PhaseScreenFunctionForm
            phaseId={parseInt(phaseId)}
            projectId={phase.projectId}
            phaseScreenFunction={editingPSF}
            effortUnit={effortUnit}
            workSettings={workSettings}
            onSuccess={() => setEditingPSF(null)}
            onCancel={() => setEditingPSF(null)}
          />
        )}
      </Modal>
    </div>
  );
}
