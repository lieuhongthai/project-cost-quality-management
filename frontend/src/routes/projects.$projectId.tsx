import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { projectApi, phaseApi, screenFunctionApi, memberApi, metricsApi } from '@/services/api';
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  ProgressBar,
  Button,
  Modal,
  EmptyState,
  Input,
  HolidayImportDialog,
} from '@/components/common';
import { MetricsChart, PhaseTimelineFrappeGantt, PhaseTimelineGantt } from '@/components/charts';
import { EffortUnitSelector, EffortUnitDropdown } from '@/components/common/EffortUnitSelector';
import { ProjectForm, PhaseForm, ScreenFunctionForm, MemberForm } from '@/components/forms';
import { format } from 'date-fns';
import type { ScreenFunction, Member, EffortUnit, ProjectSettings } from '@/types';
import { DAYS_OF_WEEK, DEFAULT_NON_WORKING_DAYS } from '@/types';
import {
  convertEffort,
  formatEffort,
  EFFORT_UNIT_LABELS,
  DEFAULT_WORK_SETTINGS,
} from '@/utils/effortUtils';

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { t } = useTranslation();
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'timeline' | 'timeline-frappe' | 'phases' | 'screen-functions' | 'members' | 'settings'
  >('overview');
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [showAddScreenFunction, setShowAddScreenFunction] = useState(false);
  const [editingScreenFunction, setEditingScreenFunction] = useState<ScreenFunction | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showCopyMembers, setShowCopyMembers] = useState(false);
  const [selectedSourceProject, setSelectedSourceProject] = useState<number | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [sfFilter, setSfFilter] = useState<{ type: string; status: string; search: string }>({
    type: '',
    status: '',
    search: '',
  });
  const [memberFilter, setMemberFilter] = useState<{ role: string; status: string; search: string }>({
    role: '',
    status: '',
    search: '',
  });
  const [effortUnit, setEffortUnit] = useState<EffortUnit>(() => {
    const stored = localStorage.getItem(`effortUnit.project.${projectId}`) as EffortUnit | null;
    return stored || 'man-hour';
  });
  const [effortUnitReady, setEffortUnitReady] = useState(false);
  const [deletingPhase, setDeletingPhase] = useState<{ id: number; name: string; linkedCount?: number } | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    workingHoursPerDay: 8,
    workingDaysPerMonth: 20,
    defaultEffortUnit: 'man-hour' as EffortUnit,
    nonWorkingDays: DEFAULT_NON_WORKING_DAYS as number[],
    holidays: [] as string[],
  });
  const [newHoliday, setNewHoliday] = useState('');
  const [showHolidayImport, setShowHolidayImport] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getOne(parseInt(projectId));
      return response.data;
    },
  });

  const { data: phases } = useQuery({
    queryKey: ['phases', parseInt(projectId)],
    queryFn: async () => {
      const response = await phaseApi.getByProject(parseInt(projectId));
      return response.data;
    },
  });

  const { data: screenFunctions } = useQuery({
    queryKey: ['screenFunctions', parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getByProject(parseInt(projectId));
      return response.data;
    },
  });

  const { data: sfSummary } = useQuery({
    queryKey: ['screenFunctionSummary', parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getSummary(parseInt(projectId));
      return response.data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ['members', parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getByProject(parseInt(projectId));
      return response.data;
    },
  });

  const { data: memberSummary } = useQuery({
    queryKey: ['memberSummary', parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getSummary(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectWorkload } = useQuery({
    queryKey: ['projectWorkload', parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getProjectWorkload(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectSettings } = useQuery({
    queryKey: ['projectSettings', parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getSettings(parseInt(projectId));
      return response.data;
    },
  });

  // Get real-time metrics for project status
  const { data: projectMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['projectMetrics', parseInt(projectId)],
    queryFn: async () => {
      const response = await metricsApi.getProjectRealTime(parseInt(projectId));
      return response.data;
    },
  });

  // Mutation to refresh/update project status
  const refreshStatusMutation = useMutation({
    mutationFn: () => metricsApi.refreshProjectStatus(parseInt(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['projectMetrics', parseInt(projectId)] });
    },
  });

  // Get all projects for copy members dropdown
  const { data: allProjects } = useQuery({
    queryKey: ['allProjects'],
    queryFn: async () => {
      const response = await projectApi.getAll();
      return response.data;
    },
  });

  // Get members from selected source project for copying
  const { data: sourceProjectMembers } = useQuery({
    queryKey: ['sourceProjectMembers', selectedSourceProject],
    queryFn: async () => {
      if (!selectedSourceProject) return [];
      const response = await memberApi.getByProject(selectedSourceProject);
      return response.data;
    },
    enabled: !!selectedSourceProject,
  });

  // Sync settings form with fetched project settings
  useEffect(() => {
    if (projectSettings) {
      const storedEffortUnit = localStorage.getItem(`effortUnit.project.${projectId}`) as EffortUnit | null;
      setSettingsForm({
        workingHoursPerDay: projectSettings.workingHoursPerDay || DEFAULT_WORK_SETTINGS.workingHoursPerDay,
        workingDaysPerMonth: projectSettings.workingDaysPerMonth || DEFAULT_WORK_SETTINGS.workingDaysPerMonth,
        defaultEffortUnit: projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
        nonWorkingDays: projectSettings.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: projectSettings.holidays || [],
      });
      setEffortUnit(
        storedEffortUnit || projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
      );
      setEffortUnitReady(true);
    }
  }, [projectSettings, projectId]);

  useEffect(() => {
    if (projectId && effortUnitReady) {
      localStorage.setItem(`effortUnit.project.${projectId}`, effortUnit);
    }
  }, [effortUnit, effortUnitReady, projectId]);

  // Helper to convert effort to display unit
  const displayEffort = (value: number, sourceUnit: EffortUnit = 'man-hour') => {
    const converted = convertEffort(value, sourceUnit, effortUnit, settingsForm);
    return formatEffort(converted, effortUnit);
  };

  const formatMetricValue = (value?: number, digits = 2) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return t('common.notAvailable');
    }
    return value.toFixed(digits);
  };

  const formatPercentValue = (value?: number, digits = 1) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return t('common.notAvailable');
    }
    return `${value.toFixed(digits)}%`;
  };

  const deleteScreenFunctionMutation = useMutation({
    mutationFn: (id: number) => screenFunctionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary', parseInt(projectId)] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => memberApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['memberSummary', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['projectWorkload', parseInt(projectId)] });
    },
  });

  const copyMembersMutation = useMutation({
    mutationFn: (data: { sourceProjectId: number; targetProjectId: number; memberIds: number[] }) =>
      memberApi.copyFromProject(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['members', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['memberSummary', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['projectWorkload', parseInt(projectId)] });
      setShowCopyMembers(false);
      setSelectedSourceProject(null);
      setSelectedMemberIds([]);
      // Show success message
      alert(`Copied ${result.data.copied} member(s). ${result.data.skipped > 0 ? `${result.data.skipped} skipped (already exist).` : ''}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (phaseOrders: Array<{ id: number; displayOrder: number }>) =>
      phaseApi.reorder(phaseOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phases', parseInt(projectId)] });
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (id: number) => phaseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phases', parseInt(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['project', parseInt(projectId)] });
      setDeletingPhase(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectApi.delete(parseInt(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate({ to: '/projects' });
    },
  });

  const handleDeletePhaseClick = async (phase: { id: number; name: string }) => {
    // Fetch phase stats to show warning about linked items
    try {
      const response = await phaseApi.getStats(phase.id);
      setDeletingPhase({
        id: phase.id,
        name: phase.name,
        linkedCount: response.data.linkedScreenFunctions,
      });
    } catch {
      setDeletingPhase({ id: phase.id, name: phase.name, linkedCount: 0 });
    }
  };

  const confirmDeletePhase = () => {
    if (deletingPhase) {
      deletePhaseMutation.mutate(deletingPhase.id);
    }
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<ProjectSettings>) =>
      projectApi.updateSettings(parseInt(projectId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectSettings', parseInt(projectId)] });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleMovePhase = (index: number, direction: 'up' | 'down') => {
    if (!phases) return;

    const newPhases = [...phases];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newPhases.length) return;

    // Swap positions
    [newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]];

    // Update displayOrder for all phases
    const phaseOrders = newPhases.map((phase, idx) => ({
      id: phase.id,
      displayOrder: idx + 1,
    }));

    reorderMutation.mutate(phaseOrders);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('project.noProjects')}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, name: t('dashboard.overview') },
    { id: 'timeline' as const, name: t('phase.timeline.title') },
    { id: 'timeline-frappe' as const, name: t('phase.timelineFrappe.title') },
    { id: 'phases' as const, name: t('nav.phases') },
    { id: 'screen-functions' as const, name: t('nav.screenFunctions') },
    { id: 'members' as const, name: t('nav.members') },
    { id: 'settings' as const, name: t('nav.settings') },
  ];

  // Filter screen functions
  const filteredScreenFunctions = screenFunctions?.filter((sf) => {
    if (sfFilter.type && sf.type !== sfFilter.type) return false;
    if (sfFilter.status && sf.status !== sfFilter.status) return false;
    if (sfFilter.search && !sf.name.toLowerCase().includes(sfFilter.search.toLowerCase())) return false;
    return true;
  });

  // Filter members
  const filteredMembers = members?.filter((m) => {
    if (memberFilter.role && m.role !== memberFilter.role) return false;
    if (memberFilter.status && m.status !== memberFilter.status) return false;
    if (memberFilter.search && !m.name.toLowerCase().includes(memberFilter.search.toLowerCase())) return false;
    return true;
  });

  // Get workload for a member
  const getMemberWorkload = (memberId: number) => {
    return projectWorkload?.find((w) => w.memberId === memberId);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-2 text-gray-600">{project.description}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowEditProject(true)}>
              {t('project.edit')}
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              {t('project.delete')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6">
          {/* Effort Unit Selector */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <span className="text-sm text-gray-500">{t('settings.defaultEffortUnit')}:</span>
            <EffortUnitSelector value={effortUnit} onChange={setEffortUnit} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('common.status')}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={project.status as any} />
                    {projectMetrics && project.status !== projectMetrics.evaluatedStatus && (
                      <button
                        onClick={() => refreshStatusMutation.mutate()}
                        disabled={refreshStatusMutation.isPending}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title={t('metrics.statusChanged')}
                      >
                        {refreshStatusMutation.isPending ? t('common.loading') : t('common.update')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Status reason hint */}
              {projectMetrics?.statusReasons && (
                <div className="mt-2 text-xs">
                  {projectMetrics.statusReasons.filter((r: any) => r.type !== 'good').slice(0, 1).map((r: any, i: number) => (
                    <span key={i} className={r.type === 'risk' ? 'text-red-600' : 'text-yellow-600'}>
                      {r.message}
                    </span>
                  ))}
                  {projectMetrics.statusReasons.every((r: any) => r.type === 'good') && (
                    <span className="text-green-600">{t('metrics.allMetricsGood')}</span>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('common.progress')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {project.progress.toFixed(1)}%
              </p>
              <ProgressBar progress={project.progress} />
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('project.estimatedEffort')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(project.estimatedEffort, 'man-month')}{' '}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t('project.actualEffort')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(project.actualEffort, 'man-month')}{' '}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {project.actualEffort > project.estimatedEffort ? (
                  <span className="text-red-600">
                    +{displayEffort(project.actualEffort - project.estimatedEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]} over
                  </span>
                ) : (
                  <span className="text-green-600">
                    {displayEffort(project.estimatedEffort - project.actualEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]} remaining
                  </span>
                )}
              </p>
            </Card>
          </div>

          {/* Project Health Metrics */}
          {projectMetrics && (
            <Card title={t('report.overallHealth')} actions={
              <button
                onClick={() => refetchMetrics()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {t('common.update')}
              </button>
            }>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* SPI */}
                <div className={`p-3 rounded-lg ${
                  projectMetrics.schedule.spi >= 0.95 ? 'bg-green-50' :
                  projectMetrics.schedule.spi >= 0.80 ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{t('metrics.spi')} ({t('metrics.schedulePerformance')})</p>
                  <p className={`text-xl font-bold ${
                    projectMetrics.schedule.spi >= 0.95 ? 'text-green-700' :
                    projectMetrics.schedule.spi >= 0.80 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {projectMetrics.schedule.spi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Target: ≥ 0.95</p>
                </div>

                {/* CPI */}
                <div className={`p-3 rounded-lg ${
                  projectMetrics.schedule.cpi >= 0.95 ? 'bg-green-50' :
                  projectMetrics.schedule.cpi >= 0.80 ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{t('metrics.cpi')} ({t('metrics.costPerformance')})</p>
                  <p className={`text-xl font-bold ${
                    projectMetrics.schedule.cpi >= 0.95 ? 'text-green-700' :
                    projectMetrics.schedule.cpi >= 0.80 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {projectMetrics.schedule.cpi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Target: ≥ 0.95</p>
                </div>

                {/* Delay Rate */}
                <div className={`p-3 rounded-lg ${
                  projectMetrics.schedule.delayRate <= 5 ? 'bg-green-50' :
                  projectMetrics.schedule.delayRate <= 20 ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{t('metrics.delayRate')}</p>
                  <p className={`text-xl font-bold ${
                    projectMetrics.schedule.delayRate <= 5 ? 'text-green-700' :
                    projectMetrics.schedule.delayRate <= 20 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {projectMetrics.schedule.delayRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">Target: ≤ 5%</p>
                </div>

                {/* Pass Rate */}
                <div className={`p-3 rounded-lg ${
                  projectMetrics.testing.totalTestCases === 0 ? 'bg-gray-50' :
                  projectMetrics.testing.passRate >= 95 ? 'bg-green-50' :
                  projectMetrics.testing.passRate >= 80 ? 'bg-yellow-50' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{t('metrics.passRate')}</p>
                  <p className={`text-xl font-bold ${
                    projectMetrics.testing.totalTestCases === 0 ? 'text-gray-400' :
                    projectMetrics.testing.passRate >= 95 ? 'text-green-700' :
                    projectMetrics.testing.passRate >= 80 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {projectMetrics.testing.totalTestCases === 0 ? 'N/A' : `${projectMetrics.testing.passRate.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-gray-500">Target: ≥ 95%</p>
                </div>
              </div>

              {/* Status Reasons */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('metrics.evaluationDetails')}:</p>
                <div className="space-y-2">
                  {projectMetrics.statusReasons.map((reason: any, index: number) => (
                    <div key={index} className={`flex items-center gap-2 text-sm ${
                      reason.type === 'good' ? 'text-green-700' :
                      reason.type === 'warning' ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        reason.type === 'good' ? 'bg-green-500' :
                        reason.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">
                        {reason.metricKey ? t(`metrics.reason.metric.${reason.metricKey}`) : reason.metric}:
                      </span>
                      <span>
                        {reason.messageKey
                          ? t(`metrics.reason.message.${reason.messageKey}`, reason.data || {})
                          : reason.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span>{t('metrics.good')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-500"></span>
                  <span>{t('metrics.warning')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span>{t('metrics.atRisk')}</span>
                </div>
                <span className="text-gray-400">|</span>
                <span>SPI = Earned Value / Planned Value</span>
                <span>CPI = Earned Value / Actual Cost</span>
              </div>
            </Card>
          )}
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card title={t('project.overview')}>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('project.startDate')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.startDate), 'MMM dd, yyyy')}
                </dd>
              </div>
              {project.endDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('project.endDate')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(project.endDate), 'MMM dd, yyyy')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('common.created')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('common.lastUpdated')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.updatedAt), 'MMM dd, yyyy')}
                </dd>
              </div>
            </dl>
          </Card>

          {projectMetrics && (
            <>
              <Card title={t('metrics.kpi')}>
                <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <MetricsChart
                      spi={projectMetrics.schedule.spi}
                      cpi={projectMetrics.schedule.cpi}
                      passRate={projectMetrics.testing.passRate}
                    />
                    <p className="mt-3 text-xs text-gray-500">{t('metrics.evmDescription')}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.spi')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.schedule.spi)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.spiFull')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.cpi')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.schedule.cpi)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.cpiFull')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.delayRate')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPercentValue(projectMetrics.schedule.delayRate, 1)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.delayRate')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.passRate')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPercentValue(projectMetrics.testing.passRate, 1)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.qualityMetrics')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.bac')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.forecasting.bac)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.bacFull')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.eac')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.forecasting.eac)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.eacFull')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.vac')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.forecasting.vac)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.vacFull')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{t('metrics.tcpi')}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.forecasting.tcpi)}</p>
                      <p className="text-xs text-gray-400">{t('metrics.tcpiFull')}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title={t('metrics.qualityMetrics')}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t('metrics.testCasesPassed')}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {projectMetrics.testing.passedTestCases.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('metrics.passRate')}: {formatPercentValue(projectMetrics.testing.passRate, 1)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t('metrics.defectRate')}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMetricValue(projectMetrics.testing.defectRate, 3)}</p>
                    <p className="text-xs text-gray-400">{t('metrics.defectsPerTestCase')}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t('metrics.testPassRate')}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatPercentValue(projectMetrics.testing.passRate, 1)}</p>
                    <p className="text-xs text-gray-400">
                      {projectMetrics.testing.totalTestCases.toLocaleString()} {t('common.total')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t('metrics.tasksDelayed')}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatPercentValue(projectMetrics.schedule.delayRate, 1)}</p>
                    <p className="text-xs text-gray-400">{t('metrics.delayInManMonths')}</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          <Card title={t('phase.phaseProgress')}>
            {phases && phases.length > 0 ? (
              <div className="space-y-4">
                {phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/phases/${phase.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{phase.name}</h4>
                      <div className="mt-2 flex items-center gap-4">
                        <StatusBadge status={phase.status as any} />
                        <span className="text-sm text-gray-500">
                          {displayEffort(phase.actualEffort, 'man-month')}/{displayEffort(phase.estimatedEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                        </span>
                      </div>
                    </div>
                    <div className="w-48">
                      <ProgressBar progress={phase.progress} showLabel />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('phase.noPhases')}
                description={t('phase.createFirst')}
                action={
                  <Button onClick={() => setShowAddPhase(true)}>
                    {t('phase.create')}
                  </Button>
                }
              />
            )}
          </Card>

        </div>
      )}

      {activeTab === 'timeline' && (
        <Card title={t('phase.timeline.title')}>
          <PhaseTimelineGantt phases={phases || []} />
        </Card>
      )}

      {activeTab === 'timeline-frappe' && (
        <Card title={t('phase.timelineFrappe.title')}>
          <PhaseTimelineFrappeGantt phases={phases || []} />
        </Card>
      )}

      {activeTab === 'phases' && (
        <Card
          title={t('phase.title')}
          actions={
            <Button onClick={() => setShowAddPhase(true)}>
              {t('phase.create')}
            </Button>
          }
        >
          {phases && phases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      {t('phase.displayOrder')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('common.name')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('common.status')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('common.progress')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('project.estimatedEffort')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('project.startDate')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('project.endDate')}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {phases.map((phase, index) => (
                    <tr key={phase.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMovePhase(index, 'up')}
                            disabled={index === 0 || reorderMutation.isPending}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMovePhase(index, 'down')}
                            disabled={index === phases.length - 1 || reorderMutation.isPending}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                        {phase.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <StatusBadge status={phase.status as any} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="w-32">
                          <ProgressBar progress={phase.progress} showLabel />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {displayEffort(phase.actualEffort, 'man-month')}/{displayEffort(phase.estimatedEffort, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(phase.startDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {phase.endDate ? format(new Date(phase.endDate), 'MMM dd, yyyy') : t('common.notAvailable')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingPhase(phase)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeletePhaseClick(phase)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={t('phase.noPhases')}
              description={t('phase.createFirst')}
              action={
                <Button onClick={() => setShowAddPhase(true)}>
                  {t('phase.create')}
                </Button>
              }
            />
          )}
        </Card>
      )}

      {activeTab === 'screen-functions' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {sfSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <Card>
                <p className="text-sm text-gray-500">{t('common.total')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{sfSummary.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {sfSummary.byType.Screen} {t('screenFunction.typeScreen')}, {sfSummary.byType.Function} {t('screenFunction.typeFunction')}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('project.estimatedEffort')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(sfSummary.totalEstimated, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('screenFunction.actualEffort')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(sfSummary.totalActual, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
                {sfSummary.variance !== 0 && (
                  <p className={`text-xs mt-1 ${sfSummary.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {sfSummary.variance > 0 ? '+' : ''}{displayEffort(sfSummary.variance, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]} ({sfSummary.variancePercentage.toFixed(1)}%)
                  </p>
                )}
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('screenFunction.averageProgress')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{sfSummary.avgProgress.toFixed(1)}%</p>
                <ProgressBar progress={sfSummary.avgProgress} />
              </Card>
            </div>
          )}

          {/* Status breakdown */}
          {sfSummary && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-400">{sfSummary.byStatus['Not Started']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusNotStarted')}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{sfSummary.byStatus['In Progress']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusInProgress')}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{sfSummary.byStatus['Completed']}</p>
                <p className="text-sm text-gray-500">{t('screenFunction.statusCompleted')}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <Card
            title={t('screenFunction.list')}
            actions={
              <Button onClick={() => setShowAddScreenFunction(true)}>
                {t('screenFunction.create')}
              </Button>
            }
          >
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder={t('screenFunction.searchPlaceholder')}
                  value={sfFilter.search}
                  onChange={(e) => setSfFilter({ ...sfFilter, search: e.target.value })}
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={sfFilter.type}
                onChange={(e) => setSfFilter({ ...sfFilter, type: e.target.value })}
              >
                <option value="">{t('screenFunction.allTypes')}</option>
                <option value="Screen">{t('screenFunction.typeScreen')}</option>
                <option value="Function">{t('screenFunction.typeFunction')}</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={sfFilter.status}
                onChange={(e) => setSfFilter({ ...sfFilter, status: e.target.value })}
              >
                <option value="">{t('screenFunction.allStatuses')}</option>
                <option value="Not Started">{t('screenFunction.statusNotStarted')}</option>
                <option value="In Progress">{t('screenFunction.statusInProgress')}</option>
                <option value="Completed">{t('screenFunction.statusCompleted')}</option>
              </select>
            </div>

            {/* Table */}
            {filteredScreenFunctions && filteredScreenFunctions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">{t('common.name')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.type')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.priority')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.complexity')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.status')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.progress')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('screenFunction.effort')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredScreenFunctions.map((sf) => (
                      <tr key={sf.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{sf.name}</p>
                            {sf.description && (
                              <p className="text-gray-500 text-xs truncate max-w-xs">{sf.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            sf.type === 'Screen' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sf.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            sf.priority === 'High' ? 'bg-red-100 text-red-800' :
                            sf.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sf.priority}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {sf.complexity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            sf.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            sf.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sf.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="w-24">
                            <ProgressBar progress={sf.progress} showLabel />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {displayEffort(sf.estimatedEffort, 'man-hour')} / {displayEffort(sf.actualEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingScreenFunction(sf)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (confirm(t('screenFunction.confirmDelete'))) {
                                  deleteScreenFunctionMutation.mutate(sf.id);
                                }
                              }}
                            >
                              {t('common.delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('screenFunction.noScreenFunctions')}
                description={t('screenFunction.noScreenFunctionsDesc')}
                action={
                  <Button onClick={() => setShowAddScreenFunction(true)}>
                    {t('screenFunction.addFirst')}
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {memberSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <Card>
                <p className="text-sm text-gray-500">{t('common.total')} {t('member.title')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{memberSummary.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {memberSummary.byStatus?.Active || 0} {t('member.statusActive')}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('member.averageExperience')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(memberSummary.averageExperience || 0).toFixed(1)} <span className="text-sm text-gray-500">{t('member.expYears')}</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('member.totalHourlyRate')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(memberSummary.totalHourlyRate || 0).toFixed(2)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">{t('member.byAvailability')}</p>
                <div className="mt-1 text-sm">
                  <span className="text-green-600">{memberSummary.byAvailability?.['Full-time'] || 0} FT</span>
                  {' / '}
                  <span className="text-blue-600">{memberSummary.byAvailability?.['Part-time'] || 0} PT</span>
                  {' / '}
                  <span className="text-yellow-600">{memberSummary.byAvailability?.['Contract'] || 0} C</span>
                </div>
              </Card>
            </div>
          )}

          {/* Role Breakdown */}
          {memberSummary && memberSummary.byRole && (
            <div className="grid grid-cols-9 gap-2">
              {Object.entries(memberSummary.byRole).map(([role, count]) => (
                <div key={role} className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{(count as number) || 0}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
              ))}
            </div>
          )}

          {/* Member List */}
          <Card
            title={t('member.teamMembers')}
            actions={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowCopyMembers(true)}>
                  {t('member.copyFromProject')}
                </Button>
                <Button onClick={() => setShowAddMember(true)}>
                  {t('member.create')}
                </Button>
              </div>
            }
          >
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder={t('screenFunction.searchPlaceholder')}
                  value={memberFilter.search}
                  onChange={(e) => setMemberFilter({ ...memberFilter, search: e.target.value })}
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={memberFilter.role}
                onChange={(e) => setMemberFilter({ ...memberFilter, role: e.target.value })}
              >
                <option value="">{t('member.allRoles')}</option>
                <option value="PM">{t('member.rolePM')}</option>
                <option value="TL">{t('member.roleTL')}</option>
                <option value="BA">{t('member.roleBA')}</option>
                <option value="DEV">{t('member.roleDEV')}</option>
                <option value="QA">{t('member.roleQA')}</option>
                <option value="Comtor">{t('member.roleComtor')}</option>
                <option value="Designer">{t('member.roleDesigner')}</option>
                <option value="DevOps">{t('member.roleDevOps')}</option>
                <option value="Other">{t('member.roleOther')}</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={memberFilter.status}
                onChange={(e) => setMemberFilter({ ...memberFilter, status: e.target.value })}
              >
                <option value="">{t('member.allStatuses')}</option>
                <option value="Active">{t('member.statusActive')}</option>
                <option value="Inactive">{t('member.statusInactive')}</option>
                <option value="On Leave">{t('member.statusOnLeave')}</option>
              </select>
            </div>

            {/* Table - Grouped by Role */}
            {filteredMembers && filteredMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">{t('common.name')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('member.role')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('member.experience')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.status')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('member.availability')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('member.workload')}</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      // Group members by role for visual separation
                      let currentRole = '';
                      return filteredMembers.map((member, index) => {
                        const workload = getMemberWorkload(member.id);
                        const isNewRole = member.role !== currentRole;
                        if (isNewRole) currentRole = member.role;

                        // Experience level indicator
                        const expYears = member.yearsOfExperience || 0;
                        const expLevel = expYears >= 10 ? 'Senior+' : expYears >= 5 ? 'Senior' : expYears >= 3 ? 'Mid' : expYears >= 1 ? 'Junior' : 'Fresher';
                        const expColor = expYears >= 10 ? 'text-purple-600' : expYears >= 5 ? 'text-blue-600' : expYears >= 3 ? 'text-green-600' : 'text-gray-600';

                        return (
                          <tr
                            key={member.id}
                            className={`hover:bg-gray-50 ${isNewRole && index > 0 ? 'border-t-2 border-gray-300' : ''}`}
                          >
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                {member.email && (
                                  <p className="text-gray-500 text-xs">{member.email}</p>
                                )}
                                {member.skills && member.skills.length > 0 && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {member.skills.slice(0, 3).map((skill, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                                        {skill}
                                      </span>
                                    ))}
                                    {member.skills.length > 3 && (
                                      <span className="text-xs text-gray-400">+{member.skills.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`px-2 py-1 text-xs rounded font-medium ${
                                member.role === 'PM' ? 'bg-purple-100 text-purple-800' :
                                member.role === 'TL' ? 'bg-blue-100 text-blue-800' :
                                member.role === 'DEV' ? 'bg-green-100 text-green-800' :
                                member.role === 'QA' ? 'bg-yellow-100 text-yellow-800' :
                                member.role === 'BA' ? 'bg-orange-100 text-orange-800' :
                                member.role === 'Comtor' ? 'bg-pink-100 text-pink-800' :
                                member.role === 'Designer' ? 'bg-indigo-100 text-indigo-800' :
                                member.role === 'DevOps' ? 'bg-cyan-100 text-cyan-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <div className="flex flex-col">
                                <span className={`font-semibold ${expColor}`}>
                                  {member.yearsOfExperience ? `${member.yearsOfExperience} ${t('member.expYears')}` : '-'}
                                </span>
                                {member.yearsOfExperience && (
                                  <span className={`text-xs ${expColor}`}>{expLevel}</span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`px-2 py-1 text-xs rounded ${
                                member.status === 'Active' ? 'bg-green-100 text-green-800' :
                                member.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {member.availability}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {workload ? (
                                <div className="text-xs">
                                  <p className="font-medium">{workload.totalAssigned} {t('member.totalAssigned')}</p>
                                  <p className="text-gray-500">
                                    {workload.completedTasks} {t('member.done')} / {workload.inProgressTasks} {t('member.active')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">{t('member.noTasks')}</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingMember(member)}
                                >
                                  {t('common.edit')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    if (confirm(t('member.delete') + '?')) {
                                      deleteMemberMutation.mutate(member.id);
                                    }
                                  }}
                                >
                                  {t('common.delete')}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('member.noMembers')}
                description={t('member.noMembersDesc')}
                action={
                  <Button onClick={() => setShowAddMember(true)}>
                    {t('member.addFirstMember')}
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card title={t('settings.workTimeConfig')}>
            <p className="text-sm text-gray-500 mb-6">
              {t('settings.workTimeConfigDesc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.workingHoursPerDay')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={settingsForm.workingHoursPerDay}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workingHoursPerDay: parseInt(e.target.value) || 8 })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.standard')}: 8 {t('time.hours')}/{t('time.days')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.workingDaysPerMonth')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={settingsForm.workingDaysPerMonth}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workingDaysPerMonth: parseInt(e.target.value) || 20 })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.standard')}: 20-22 {t('time.days')}/{t('time.months')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.defaultEffortUnit')}
                </label>
                <EffortUnitDropdown
                  value={settingsForm.defaultEffortUnit}
                  onChange={(unit) => setSettingsForm({ ...settingsForm, defaultEffortUnit: unit })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default display unit for efforts
                </p>
              </div>
            </div>

            {/* Conversion Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('settings.conversionPreview')}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-2xl font-bold text-primary-600">1</p>
                  <p className="text-gray-500">Man-Month</p>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-2xl font-bold text-primary-600">{settingsForm.workingDaysPerMonth}</p>
                  <p className="text-gray-500">Man-Days</p>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-2xl font-bold text-primary-600">{settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth}</p>
                  <p className="text-gray-500">Man-Hours</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                1 MM = {settingsForm.workingDaysPerMonth} MD = {settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth} MH
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? t('common.loading') : t('settings.saveSettings')}
              </Button>
            </div>
            {updateSettingsMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-2 text-right">{t('settings.settingsSaved')}</p>
            )}
          </Card>

          {/* Current Settings Summary */}
          <Card title={t('settings.currentConversionRates')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('settings.fromManHours')}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1 MH = {(1 / settingsForm.workingHoursPerDay).toFixed(4)} MD</li>
                  <li>1 MH = {(1 / (settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth)).toFixed(6)} MM</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('settings.fromManDays')}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1 MD = {settingsForm.workingHoursPerDay} MH</li>
                  <li>1 MD = {(1 / settingsForm.workingDaysPerMonth).toFixed(4)} MM</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Work Calendar Settings */}
          <Card title={t('settings.workCalendar')}>
            <p className="text-sm text-gray-500 mb-6">
              {t('settings.workCalendarDesc')}
            </p>

            {/* Non-Working Days */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('settings.nonWorkingDaysOfWeek')}
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = settingsForm.nonWorkingDays.includes(day.value);
                  // Can't select if it would result in all 7 days being non-working
                  const wouldBeAllNonWorking = !isSelected && settingsForm.nonWorkingDays.length >= 6;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (wouldBeAllNonWorking) return; // Prevent selecting all days

                        setSettingsForm({
                          ...settingsForm,
                          nonWorkingDays: isSelected
                            ? settingsForm.nonWorkingDays.filter((d) => d !== day.value)
                            : [...settingsForm.nonWorkingDays, day.value].sort((a, b) => a - b),
                        });
                      }}
                      disabled={wouldBeAllNonWorking}
                      title={wouldBeAllNonWorking ? t('settings.atLeastOneWorkingDay') : undefined}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : wouldBeAllNonWorking
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.nonWorkingDaysHelp')}
              </p>
              {settingsForm.nonWorkingDays.length >= 6 && (
                <p className="text-xs text-orange-600 mt-1">
                  {t('settings.atLeastOneWorkingDay')}
                </p>
              )}
            </div>

            {/* Holidays */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.holidays')}
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHolidayImport(true)}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('settings.importFromCalendar')}
                  </span>
                </Button>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newHoliday && !settingsForm.holidays.includes(newHoliday)) {
                      setSettingsForm({
                        ...settingsForm,
                        holidays: [...settingsForm.holidays, newHoliday].sort(),
                      });
                      setNewHoliday('');
                    }
                  }}
                  disabled={!newHoliday}
                >
                  {t('settings.addHoliday')}
                </Button>
              </div>

              {settingsForm.holidays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {settingsForm.holidays.map((holiday) => (
                    <span
                      key={holiday}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                    >
                      {format(new Date(holiday), 'MMM dd, yyyy')}
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsForm({
                            ...settingsForm,
                            holidays: settingsForm.holidays.filter((h) => h !== holiday),
                          });
                        }}
                        className="ml-1 text-orange-500 hover:text-orange-700"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">{t('settings.noHolidaysAdded')}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {t('settings.holidaysHelp')}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? t('common.loading') : t('settings.saveCalendarSettings')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title={t('project.edit')}
      >
        <ProjectForm
          project={project}
          effortUnit={effortUnit}
          workSettings={settingsForm}
          onSuccess={() => setShowEditProject(false)}
          onCancel={() => setShowEditProject(false)}
        />
      </Modal>

      <Modal
        isOpen={showAddPhase || !!editingPhase}
        onClose={() => {
          setShowAddPhase(false);
          setEditingPhase(null);
        }}
        title={editingPhase ? t('phase.edit') : t('phase.create')}
      >
        <PhaseForm
          projectId={parseInt(projectId)}
          phase={editingPhase}
          effortUnit={effortUnit}
          workSettings={settingsForm}
          onSuccess={() => {
            setShowAddPhase(false);
            setEditingPhase(null);
          }}
          onCancel={() => {
            setShowAddPhase(false);
            setEditingPhase(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showAddScreenFunction || !!editingScreenFunction}
        onClose={() => {
          setShowAddScreenFunction(false);
          setEditingScreenFunction(null);
        }}
        title={editingScreenFunction ? t('screenFunction.edit') : t('screenFunction.create')}
      >
        <ScreenFunctionForm
          projectId={parseInt(projectId)}
          screenFunction={editingScreenFunction || undefined}
          effortUnit={effortUnit}
          workSettings={settingsForm}
          onSuccess={() => {
            setShowAddScreenFunction(false);
            setEditingScreenFunction(null);
          }}
          onCancel={() => {
            setShowAddScreenFunction(false);
            setEditingScreenFunction(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showAddMember || !!editingMember}
        onClose={() => {
          setShowAddMember(false);
          setEditingMember(null);
        }}
        title={editingMember ? t('member.edit') : t('member.create')}
      >
        <MemberForm
          projectId={parseInt(projectId)}
          member={editingMember || undefined}
          onSuccess={() => {
            setShowAddMember(false);
            setEditingMember(null);
          }}
          onCancel={() => {
            setShowAddMember(false);
            setEditingMember(null);
          }}
        />
      </Modal>

      {/* Delete Phase Confirmation Modal */}
      <Modal
        isOpen={!!deletingPhase}
        onClose={() => setDeletingPhase(null)}
        title={t('phase.delete')}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('phase.deleteConfirm')} <strong>"{deletingPhase?.name}"</strong>?
          </p>

          {deletingPhase?.linkedCount && deletingPhase.linkedCount > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-yellow-800 font-medium">{t('common.warning')}</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    {t('phase.deleteWarning')} <strong>{deletingPhase.linkedCount}</strong> {t('phase.deleteWarningItems')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {t('phase.deleteIrreversible')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeletingPhase(null)}
              disabled={deletePhaseMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeletePhase}
              loading={deletePhaseMutation.isPending}
            >
              {t('phase.delete')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Holiday Import Dialog */}
      <HolidayImportDialog
        isOpen={showHolidayImport}
        onClose={() => setShowHolidayImport(false)}
        onImport={(dates) => {
          const newHolidays = [...settingsForm.holidays];
          dates.forEach((date) => {
            if (!newHolidays.includes(date)) {
              newHolidays.push(date);
            }
          });
          setSettingsForm({
            ...settingsForm,
            holidays: newHolidays.sort(),
          });
        }}
        existingHolidays={settingsForm.holidays}
      />

      {/* Copy Members Modal */}
      <Modal
        isOpen={showCopyMembers}
        onClose={() => {
          setShowCopyMembers(false);
          setSelectedSourceProject(null);
          setSelectedMemberIds([]);
        }}
        title={t('member.copyFromProject')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('member.selectSourceProject')}
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedSourceProject || ''}
              onChange={(e) => {
                setSelectedSourceProject(e.target.value ? parseInt(e.target.value) : null);
                setSelectedMemberIds([]);
              }}
            >
              <option value="">{t('member.selectProject')}</option>
              {allProjects
                ?.filter((p) => p.id !== parseInt(projectId))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Member Selection */}
          {selectedSourceProject && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('member.selectMembersToCopy')}
                </label>
                {sourceProjectMembers && sourceProjectMembers.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:text-primary-700"
                    onClick={() => {
                      if (selectedMemberIds.length === sourceProjectMembers.length) {
                        setSelectedMemberIds([]);
                      } else {
                        setSelectedMemberIds(sourceProjectMembers.map((m) => m.id));
                      }
                    }}
                  >
                    {selectedMemberIds.length === sourceProjectMembers?.length
                      ? t('member.deselectAll')
                      : t('member.selectAll')}
                  </button>
                )}
              </div>

              {sourceProjectMembers && sourceProjectMembers.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {sourceProjectMembers.map((member) => {
                    const isExisting = members?.some(
                      (m) =>
                        m.name.toLowerCase() === member.name.toLowerCase() &&
                        (m.email?.toLowerCase() || '') === (member.email?.toLowerCase() || '')
                    );
                    return (
                      <label
                        key={member.id}
                        className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                          isExisting ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => {
                            if (selectedMemberIds.includes(member.id)) {
                              setSelectedMemberIds(selectedMemberIds.filter((id) => id !== member.id));
                            } else {
                              setSelectedMemberIds([...selectedMemberIds, member.id]);
                            }
                          }}
                          disabled={isExisting}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded font-medium ${
                                member.role === 'PM'
                                  ? 'bg-purple-100 text-purple-800'
                                  : member.role === 'TL'
                                  ? 'bg-blue-100 text-blue-800'
                                  : member.role === 'DEV'
                                  ? 'bg-green-100 text-green-800'
                                  : member.role === 'QA'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {member.role}
                            </span>
                            {isExisting && (
                              <span className="text-xs text-orange-600">({t('member.alreadyExists')})</span>
                            )}
                          </div>
                          {member.email && (
                            <p className="text-sm text-gray-500">{member.email}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              member.availability === 'Full-time'
                                ? 'bg-green-100 text-green-800'
                                : member.availability === 'Part-time'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {member.availability}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('member.noMembersInProject')}
                </div>
              )}
            </div>
          )}

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedMemberIds.length > 0 && (
                <span>
                  <strong>{selectedMemberIds.length}</strong> {t('member.membersSelected')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCopyMembers(false);
                  setSelectedSourceProject(null);
                  setSelectedMemberIds([]);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedSourceProject && selectedMemberIds.length > 0) {
                    copyMembersMutation.mutate({
                      sourceProjectId: selectedSourceProject,
                      targetProjectId: parseInt(projectId),
                      memberIds: selectedMemberIds,
                    });
                  }
                }}
                disabled={!selectedSourceProject || selectedMemberIds.length === 0}
                loading={copyMembersMutation.isPending}
              >
                {t('member.copy')} {selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : ''}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('project.delete')}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('project.deleteConfirm')} <strong>"{project.name}"</strong>?
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-red-800 font-medium">{t('common.warning')}</p>
                <p className="text-red-700 text-sm mt-1">
                  {t('project.deleteWarning')}
                </p>
                <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
                  <li>{t('project.deleteWarningPhases')}</li>
                  <li>{t('project.deleteWarningScreenFunctions')}</li>
                  <li>{t('project.deleteWarningMembers')}</li>
                  <li>{t('project.deleteWarningReports')}</li>
                  <li>{t('project.deleteWarningTesting')}</li>
                </ul>
                <p className="text-red-700 text-sm mt-2 font-medium">
                  {t('project.deleteIrreversible')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteProjectMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteProjectMutation.mutate()}
              loading={deleteProjectMutation.isPending}
            >
              {t('project.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
