import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { projectApi, phaseApi, screenFunctionApi, memberApi } from '@/services/api';
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  ProgressBar,
  Button,
  Modal,
  EmptyState,
  Input,
} from '@/components/common';
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
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'screen-functions' | 'members' | 'settings'>('overview');
  const [showEditProject, setShowEditProject] = useState(false);
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
  const [effortUnit, setEffortUnit] = useState<EffortUnit>('man-hour');
  const [deletingPhase, setDeletingPhase] = useState<{ id: number; name: string; linkedCount?: number } | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    workingHoursPerDay: 8,
    workingDaysPerMonth: 20,
    defaultEffortUnit: 'man-hour' as EffortUnit,
    nonWorkingDays: DEFAULT_NON_WORKING_DAYS as number[],
    holidays: [] as string[],
  });
  const [newHoliday, setNewHoliday] = useState('');

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
      setSettingsForm({
        workingHoursPerDay: projectSettings.workingHoursPerDay || DEFAULT_WORK_SETTINGS.workingHoursPerDay,
        workingDaysPerMonth: projectSettings.workingDaysPerMonth || DEFAULT_WORK_SETTINGS.workingDaysPerMonth,
        defaultEffortUnit: projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
        nonWorkingDays: projectSettings.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: projectSettings.holidays || [],
      });
      setEffortUnit(projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit);
    }
  }, [projectSettings]);

  // Helper to convert effort to display unit
  const displayEffort = (value: number, sourceUnit: EffortUnit = 'man-hour') => {
    const converted = convertEffort(value, sourceUnit, effortUnit, settingsForm);
    return formatEffort(converted, effortUnit);
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
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, name: 'Overview' },
    { id: 'phases' as const, name: 'Phases' },
    { id: 'screen-functions' as const, name: 'Screen/Function' },
    { id: 'members' as const, name: 'Members' },
    { id: 'settings' as const, name: 'Settings' },
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
          <Button onClick={() => setShowEditProject(true)}>
            Edit Project
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6">
          {/* Effort Unit Selector */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <span className="text-sm text-gray-500">Display effort in:</span>
            <EffortUnitSelector value={effortUnit} onChange={setEffortUnit} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={project.status as any} />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Progress</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {project.progress.toFixed(1)}%
              </p>
              <ProgressBar progress={project.progress} />
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Estimated Effort</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(project.estimatedEffort, 'man-month')}{' '}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Actual Effort</p>
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
          <Card title="Project Information">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.startDate), 'MMM dd, yyyy')}
                </dd>
              </div>
              {project.endDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">End Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(project.endDate), 'MMM dd, yyyy')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.updatedAt), 'MMM dd, yyyy')}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Phases Overview">
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
                title="No phases yet"
                description="Add phases to start tracking progress"
                action={
                  <Button onClick={() => setShowAddPhase(true)}>
                    Add First Phase
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === 'phases' && (
        <Card
          title="Phases"
          actions={
            <Button onClick={() => setShowAddPhase(true)}>
              Add Phase
            </Button>
          }
        >
          {phases && phases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Order
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Progress
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Effort
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Start Date
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingPhase(phase)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeletePhaseClick(phase)}
                          >
                            Delete
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
              title="No phases yet"
              description="Add phases to start tracking progress"
              action={
                <Button onClick={() => setShowAddPhase(true)}>
                  Add First Phase
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
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{sfSummary.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {sfSummary.byType.Screen} Screens, {sfSummary.byType.Function} Functions
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Estimated Effort</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(sfSummary.totalEstimated, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Actual Effort</p>
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
                <p className="text-sm text-gray-500">Average Progress</p>
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
                <p className="text-sm text-gray-500">Not Started</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{sfSummary.byStatus['In Progress']}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{sfSummary.byStatus['Completed']}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <Card
            title="Screen/Function List"
            actions={
              <Button onClick={() => setShowAddScreenFunction(true)}>
                Add Screen/Function
              </Button>
            }
          >
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by name..."
                  value={sfFilter.search}
                  onChange={(e) => setSfFilter({ ...sfFilter, search: e.target.value })}
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={sfFilter.type}
                onChange={(e) => setSfFilter({ ...sfFilter, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="Screen">Screen</option>
                <option value="Function">Function</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={sfFilter.status}
                onChange={(e) => setSfFilter({ ...sfFilter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Table */}
            {filteredScreenFunctions && filteredScreenFunctions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Priority</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Complexity</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Progress</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Effort (Est/Act)</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
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
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  deleteScreenFunctionMutation.mutate(sf.id);
                                }
                              }}
                            >
                              Delete
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
                title="No screen/function yet"
                description="Add screens and functions to track detailed effort per phase"
                action={
                  <Button onClick={() => setShowAddScreenFunction(true)}>
                    Add First Item
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
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{memberSummary.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {memberSummary.byStatus?.Active || 0} Active
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Average Experience</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(memberSummary.averageExperience || 0).toFixed(1)} <span className="text-sm text-gray-500">years</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Total Hourly Rate</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(memberSummary.totalHourlyRate || 0).toFixed(2)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">By Availability</p>
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
            title="Team Members"
            actions={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowCopyMembers(true)}>
                  Copy from Project
                </Button>
                <Button onClick={() => setShowAddMember(true)}>
                  Add Member
                </Button>
              </div>
            }
          >
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by name..."
                  value={memberFilter.search}
                  onChange={(e) => setMemberFilter({ ...memberFilter, search: e.target.value })}
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={memberFilter.role}
                onChange={(e) => setMemberFilter({ ...memberFilter, role: e.target.value })}
              >
                <option value="">All Roles</option>
                <option value="PM">PM</option>
                <option value="TL">TL</option>
                <option value="BA">BA</option>
                <option value="DEV">DEV</option>
                <option value="QA">QA</option>
                <option value="Comtor">Comtor</option>
                <option value="Designer">Designer</option>
                <option value="DevOps">DevOps</option>
                <option value="Other">Other</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={memberFilter.status}
                onChange={(e) => setMemberFilter({ ...memberFilter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            {/* Table - Grouped by Role */}
            {filteredMembers && filteredMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Experience</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Availability</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Workload</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
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
                                  {member.yearsOfExperience ? `${member.yearsOfExperience} years` : '-'}
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
                                  <p className="font-medium">{workload.totalAssigned} tasks</p>
                                  <p className="text-gray-500">
                                    {workload.completedTasks} done / {workload.inProgressTasks} active
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">No tasks</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingMember(member)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this member?')) {
                                      deleteMemberMutation.mutate(member.id);
                                    }
                                  }}
                                >
                                  Delete
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
                title="No members yet"
                description="Add team members to track workload and assign tasks"
                action={
                  <Button onClick={() => setShowAddMember(true)}>
                    Add First Member
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card title="Work Time Configuration">
            <p className="text-sm text-gray-500 mb-6">
              Configure working hours and days to accurately calculate effort conversions between man-hours, man-days, and man-months.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Hours per Day
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
                  Standard: 8 hours/day
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Days per Month
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
                  Standard: 20-22 days/month
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Effort Unit
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">Conversion Preview</h4>
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
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
            {updateSettingsMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-2 text-right">Settings saved successfully!</p>
            )}
          </Card>

          {/* Current Settings Summary */}
          <Card title="Current Conversion Rates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">From Man-Hours</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1 MH = {(1 / settingsForm.workingHoursPerDay).toFixed(4)} MD</li>
                  <li>1 MH = {(1 / (settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth)).toFixed(6)} MM</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">From Man-Days</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1 MD = {settingsForm.workingHoursPerDay} MH</li>
                  <li>1 MD = {(1 / settingsForm.workingDaysPerMonth).toFixed(4)} MM</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Work Calendar Settings */}
          <Card title="Work Calendar">
            <p className="text-sm text-gray-500 mb-6">
              Configure non-working days and holidays to accurately calculate project end dates.
            </p>

            {/* Non-Working Days */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Non-Working Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const isSelected = settingsForm.nonWorkingDays.includes(day.value);
                      setSettingsForm({
                        ...settingsForm,
                        nonWorkingDays: isSelected
                          ? settingsForm.nonWorkingDays.filter((d) => d !== day.value)
                          : [...settingsForm.nonWorkingDays, day.value].sort((a, b) => a - b),
                      });
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      settingsForm.nonWorkingDays.includes(day.value)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected days (shown in red) will be skipped when calculating project end dates.
                Default: Saturday and Sunday.
              </p>
            </div>

            {/* Holidays */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Holidays
              </label>
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
                  Add Holiday
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
                <p className="text-sm text-gray-400 italic">No holidays added yet.</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Add specific dates that should be treated as non-working days (e.g., national holidays, company events).
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Calendar Settings'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title="Edit Project"
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
        title={editingPhase ? "Edit Phase" : "Add Phase"}
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
        title={editingScreenFunction ? "Edit Screen/Function" : "Add Screen/Function"}
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
        title={editingMember ? "Edit Member" : "Add Member"}
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
        title="Delete Phase"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the phase <strong>"{deletingPhase?.name}"</strong>?
          </p>

          {deletingPhase?.linkedCount && deletingPhase.linkedCount > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-yellow-800 font-medium">Warning</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    This phase has <strong>{deletingPhase.linkedCount}</strong> linked Screen/Function item(s).
                    Deleting this phase will also remove all linked items and their data.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              This action cannot be undone.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeletingPhase(null)}
              disabled={deletePhaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeletePhase}
              loading={deletePhaseMutation.isPending}
            >
              Delete Phase
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy Members Modal */}
      <Modal
        isOpen={showCopyMembers}
        onClose={() => {
          setShowCopyMembers(false);
          setSelectedSourceProject(null);
          setSelectedMemberIds([]);
        }}
        title="Copy Members from Another Project"
        size="lg"
      >
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Source Project
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedSourceProject || ''}
              onChange={(e) => {
                setSelectedSourceProject(e.target.value ? parseInt(e.target.value) : null);
                setSelectedMemberIds([]);
              }}
            >
              <option value="">-- Select a project --</option>
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
                  Select Members to Copy
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
                      ? 'Deselect All'
                      : 'Select All'}
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
                              <span className="text-xs text-orange-600">(Already exists)</span>
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
                  No members in this project
                </div>
              )}
            </div>
          )}

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedMemberIds.length > 0 && (
                <span>
                  <strong>{selectedMemberIds.length}</strong> member(s) selected
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
                Cancel
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
                Copy {selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : ''}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
