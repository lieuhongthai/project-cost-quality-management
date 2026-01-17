import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { phaseApi, effortApi, testingApi, screenFunctionApi, phaseScreenFunctionApi, projectApi } from "@/services/api";
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
import { EffortForm, TestingForm, PhaseScreenFunctionForm } from "@/components/forms";
import {
  ProgressChart,
  TestingQualityChart,
  PhaseEfficiencyChart,
  PhaseStatusPieChart,
  PhaseProgressOverview,
} from "@/components/charts";
import { format } from "date-fns";
import type { PhaseScreenFunction, EffortUnit } from "@/types";
import {
  convertEffort,
  formatEffort,
  EFFORT_UNIT_LABELS,
  DEFAULT_WORK_SETTINGS,
} from "@/utils/effortUtils";

export const Route = createFileRoute("/phases/$phaseId")({
  component: PhaseDetail,
});

function PhaseDetail() {
  const { phaseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"charts" | "efforts" | "testing" | "screen-functions">("screen-functions");
  const [showAddEffort, setShowAddEffort] = useState(false);
  const [showAddTesting, setShowAddTesting] = useState(false);
  const [editingEffort, setEditingEffort] = useState<any>(null);
  const [editingTesting, setEditingTesting] = useState<any>(null);
  const [editingPSF, setEditingPSF] = useState<PhaseScreenFunction | null>(null);
  const [showLinkScreenFunction, setShowLinkScreenFunction] = useState(false);
  const [selectedSFIds, setSelectedSFIds] = useState<number[]>([]);
  const [effortUnit, setEffortUnit] = useState<EffortUnit>('man-hour');
  const [workSettings, setWorkSettings] = useState(DEFAULT_WORK_SETTINGS);

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
      setWorkSettings({
        workingHoursPerDay: projectSettings.workingHoursPerDay || DEFAULT_WORK_SETTINGS.workingHoursPerDay,
        workingDaysPerMonth: projectSettings.workingDaysPerMonth || DEFAULT_WORK_SETTINGS.workingDaysPerMonth,
        defaultEffortUnit: projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit,
      });
      setEffortUnit(projectSettings.defaultEffortUnit || DEFAULT_WORK_SETTINGS.defaultEffortUnit);
    }
  }, [projectSettings]);

  // Helper to convert effort to display unit
  const displayEffort = (value: number, sourceUnit: EffortUnit = 'man-hour') => {
    const converted = convertEffort(value, sourceUnit, effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
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

  // Get unlinked screen functions
  const linkedSFIds = phaseScreenFunctions?.map(psf => psf.screenFunctionId) || [];
  const unlinkedScreenFunctions = allScreenFunctions?.filter(sf => !linkedSFIds.includes(sf.id)) || [];

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
        <p className="text-gray-500">Phase not found</p>
      </div>
    );
  }

  // Prepare chart data
  const effortChartData =
    efforts?.map((e) => ({
      week: `Week ${e.weekNumber}`,
      planned: e.plannedEffort,
      actual: e.actualEffort,
      progress: e.progress,
    })) || [];

  const testingChartData =
    testing?.map((t) => ({
      week: `Week ${t.weekNumber}`,
      passed: t.passedTestCases,
      failed: t.failedTestCases,
      passRate: t.passRate,
    })) || [];

  const tabs = [
    { id: "screen-functions" as const, name: "Screen/Function" },
    { id: "charts" as const, name: "Charts" },
    { id: "testing" as const, name: "Testing" },
    // Hidden: Efforts tab can be re-enabled by uncommenting the line below
    // { id: "efforts" as const, name: "Efforts" },
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
          Projects
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
          <span className="text-gray-400">Loading...</span>
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
          Back to {project?.name || 'Project'}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{phase.name}</h1>
            <p className="mt-1 text-gray-600">Phase Details and Tracking</p>
          </div>
          {project && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Project</p>
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
            <span className="text-sm text-gray-500">Display effort in:</span>
            <EffortUnitSelector value={effortUnit} onChange={setEffortUnit} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Card>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={phase.status as any} />
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Progress</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {phase.progress.toFixed(1)}%
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Estimated Effort</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(phase.estimatedEffort, 'man-month')}{" "}
                <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Actual Effort</p>
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
                <p className="text-sm text-gray-500">Total Planned</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(effortSummary.totalPlanned, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Total Actual</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(effortSummary.totalActual, 'man-month')} {EFFORT_UNIT_LABELS[effortUnit]}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Variance</p>
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
            <Card title="Effort Trend">
              <ProgressChart data={effortChartData} />
            </Card>
          )}

          <Card
            title="Weekly Efforts"
            actions={
              <Button size="sm" onClick={() => setShowAddEffort(true)}>
                Add Effort
              </Button>
            }
          >
            {efforts && efforts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Week
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date Range
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Planned
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actual
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Progress
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {efforts.map((effort) => (
                      <tr key={effort.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Week {effort.weekNumber}
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
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No effort data"
                description="Add weekly effort records to track progress"
                action={
                  <Button onClick={() => setShowAddEffort(true)}>
                    Add First Effort Record
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
                <p className="text-sm text-gray-500">Total Test Cases</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.totalTestCases}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Pass Rate</p>
                <p className="mt-1 text-2xl font-semibold text-green-600">
                  {testingSummary.overallPassRate.toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Total Defects</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">
                  {testingSummary.totalDefects}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Defect Rate</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.overallDefectRate.toFixed(3)}
                </p>
              </Card>
            </div>
          )}

          {testingChartData.length > 0 && (
            <Card title="Testing Quality Trend">
              <TestingQualityChart data={testingChartData} />
            </Card>
          )}

          <Card
            title="Weekly Testing Data"
            actions={
              <Button size="sm" onClick={() => setShowAddTesting(true)}>
                Add Testing Data
              </Button>
            }
          >
            {testing && testing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Week
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Total Cases
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Passed
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Failed
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Pass Rate
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Defects
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testing.map((test) => (
                      <tr key={test.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Week {test.weekNumber}
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
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No testing data"
                description="Add weekly testing records to track quality"
                action={
                  <Button onClick={() => setShowAddTesting(true)}>
                    Add First Testing Record
                  </Button>
                }
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
                <p className="text-sm text-gray-500">Linked Items</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{psfSummary.total}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Estimated Effort</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {displayEffort(psfSummary.totalEstimated, 'man-hour')} <span className="text-sm text-gray-500">{EFFORT_UNIT_LABELS[effortUnit]}</span>
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Actual Effort</p>
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
                <p className="text-sm text-gray-500">Progress</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(psfSummary.progress ?? 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {psfSummary.completedCount ?? psfSummary.byStatus?.Completed ?? 0}/{psfSummary.activeCount ?? psfSummary.total} completed
                </p>
                <ProgressBar progress={psfSummary.progress ?? 0} />
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Average Progress</p>
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
                <p className="text-sm text-gray-500">Not Started</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{psfSummary.byStatus['In Progress']}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{psfSummary.byStatus['Completed']}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">{psfSummary.byStatus['Skipped']}</p>
                <p className="text-sm text-gray-500">Skipped</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <Card
            title="Screen/Function in this Phase"
            actions={
              <Button size="sm" onClick={() => setShowLinkScreenFunction(true)}>
                Link Screen/Function
              </Button>
            }
          >
            {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Assignee</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Progress</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Est. Effort</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Act. Effort</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Variance</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {phaseScreenFunctions.map((psf) => {
                      const variance = psf.actualEffort - psf.estimatedEffort;
                      return (
                        <tr key={psf.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                            <p className="font-medium text-gray-900">{psf.screenFunction?.name || 'Unknown'}</p>
                            {psf.note && (
                              <p className="text-gray-500 text-xs truncate max-w-xs">{psf.note}</p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              psf.screenFunction?.type === 'Screen' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {psf.screenFunction?.type || 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {psf.assignee ? (
                              <div>
                                <p className="font-medium text-gray-900">{psf.assignee.name}</p>
                                <p className="text-xs text-gray-500">{psf.assignee.role}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs rounded ${
                              psf.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              psf.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              psf.status === 'Skipped' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {psf.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="w-20">
                              <ProgressBar progress={psf.progress} showLabel />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {displayEffort(psf.estimatedEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {displayEffort(psf.actualEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={variance > 0 ? 'text-red-600' : 'text-green-600'}>
                              {variance > 0 ? '+' : ''}{displayEffort(variance, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingPSF(psf)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (confirm('Unlink this item from phase?')) {
                                    unlinkMutation.mutate(psf.id);
                                  }
                                }}
                              >
                                Unlink
                              </Button>
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
                title="No screen/function linked"
                description="Link screen/functions from the project to track detailed effort in this phase"
                action={
                  <Button onClick={() => setShowLinkScreenFunction(true)}>
                    Link Screen/Function
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
              <p className="text-sm text-gray-500">Hiệu suất Phase</p>
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
                            {isGood ? 'Công việc hiệu quả' : isWarning ? 'Hơi vượt dự kiến' : 'Vượt dự kiến nhiều'}
                          </p>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-2xl font-semibold text-gray-400">--</p>
                )}
              </div>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">
                {psfSummary?.byStatus?.Completed ?? 0}/{psfSummary?.total ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Screen/Function</p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">Tiến độ tổng thể</p>
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
            <Card title="Phân bố trạng thái">
              {psfSummary ? (
                <PhaseStatusPieChart data={psfSummary.byStatus} />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-500">
                  Chưa có dữ liệu
                </div>
              )}
            </Card>

            <Card title="Tiến độ từng mục">
              {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
                <PhaseProgressOverview
                  data={phaseScreenFunctions.map(psf => ({
                    name: psf.screenFunction?.name || 'Unknown',
                    progress: psf.progress,
                    status: psf.status,
                  }))}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  Chưa có dữ liệu Screen/Function
                </div>
              )}
            </Card>
          </div>

          {/* Charts Row 2: Efficiency Comparison */}
          <Card title="So sánh Effort (Dự kiến vs Thực tế)">
            <p className="text-sm text-gray-500 mb-4">
              Hiển thị các mục có hiệu suất thấp nhất. Màu xanh = hiệu quả, màu vàng = hơi vượt, màu đỏ = vượt nhiều.
            </p>
            {phaseScreenFunctions && phaseScreenFunctions.length > 0 ? (
              <PhaseEfficiencyChart
                data={phaseScreenFunctions.map(psf => ({
                  name: psf.screenFunction?.name || 'Unknown',
                  estimated: psf.estimatedEffort,
                  actual: psf.actualEffort,
                  progress: psf.progress,
                }))}
                effortLabel={EFFORT_UNIT_LABELS[effortUnit]}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Chưa có dữ liệu Screen/Function
              </div>
            )}
          </Card>

          {/* Testing Quality Chart (if testing data exists) */}
          {testingChartData.length > 0 && (
            <Card title="Chất lượng Testing theo tuần">
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
        title={editingEffort ? "Edit Effort Record" : "Add Effort Record"}
      >
        <EffortForm
          phaseId={parseInt(phaseId)}
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
        title={editingTesting ? "Edit Testing Data" : "Add Testing Data"}
      >
        <TestingForm
          phaseId={parseInt(phaseId)}
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

      {/* Link Screen/Function Modal */}
      <Modal
        isOpen={showLinkScreenFunction}
        onClose={() => {
          setShowLinkScreenFunction(false);
          setSelectedSFIds([]);
        }}
        title="Link Screen/Function to Phase"
        size="lg"
      >
        <div className="space-y-4">
          {unlinkedScreenFunctions.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">
                Select screen/functions to link to this phase. You can add estimated effort after linking.
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
                          {sf.type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.priority === 'High' ? 'bg-red-100 text-red-800' :
                          sf.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sf.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sf.complexity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {displayEffort(sf.estimatedEffort, 'man-hour')} {EFFORT_UNIT_LABELS[effortUnit]} total
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
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkScreenFunctions}
                  disabled={selectedSFIds.length === 0 || linkMutation.isPending}
                  loading={linkMutation.isPending}
                >
                  Link {selectedSFIds.length > 0 ? `(${selectedSFIds.length})` : ''}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title="No unlinked items"
              description="All screen/functions in this project are already linked to this phase, or no items exist yet."
            />
          )}
        </div>
      </Modal>

      {/* Edit Phase Screen Function Modal */}
      <Modal
        isOpen={!!editingPSF}
        onClose={() => setEditingPSF(null)}
        title="Update Effort Details"
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
