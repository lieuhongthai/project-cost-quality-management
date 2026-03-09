import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  projectApi,
  screenFunctionApi,
  memberApi,
  metricsApi,
  taskWorkflowApi,
} from "@/services/api";
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  ProgressBar,
  Button,
  Modal,
  Select,
} from "@/components/common";
import {
  EffortUnitSelector,
} from "@/components/common/EffortUnitSelector";
import {
  ProjectForm,
  ScreenFunctionForm,
  MemberForm,
} from "@/components/forms";
import { AISchedulingDialog } from "@/components/ai/AISchedulingDialog";
import { AIPlanAllDialog } from "@/components/ai/AIPlanAllDialog";
import type {
  ScreenFunction,
  Member,
  EffortUnit,
  ProjectSettings,
} from "@/types";
import { DEFAULT_NON_WORKING_DAYS } from "@/types";
import {
  convertEffort,
  formatEffort,
  EFFORT_UNIT_LABELS,
  DEFAULT_WORK_SETTINGS,
} from "@/utils/effortUtils";
import { ProjectOverviewTab } from "@/views/project/ProjectOverviewTab";
import { ProjectTimelineTab } from "@/views/project/ProjectTimelineTab";
import { ProjectStagesTab } from "@/views/project/ProjectStagesTab";
import { ProjectTaskWorkflowTab } from "@/views/project/ProjectTaskWorkflowTab";
import { ProjectScreenFunctionsTab } from "@/views/project/ProjectScreenFunctionsTab";
import { ProjectMembersTab } from "@/views/project/ProjectMembersTab";
import { ProjectMetricSummaryTab } from "@/views/project/ProjectMetricSummaryTab";
import { ProjectSettingsTab } from "@/views/project/ProjectSettingsTab";

const PROJECT_TABS = [
  "overview",
  "timeline",
  "stages",
  "screen-functions",
  "members",
  "task-workflow",
  "metric-summary",
  "settings",
] as const;

type ProjectTab = (typeof PROJECT_TABS)[number];

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetail,
  validateSearch: (search: Record<string, unknown>) => {
    const tab =
      typeof search.tab === "string" &&
      PROJECT_TABS.includes(search.tab as ProjectTab)
        ? (search.tab as ProjectTab)
        : "overview";
    return { tab };
  },
});

function ProjectDetail() {
  const { t } = useTranslation();
  const { projectId } = Route.useParams();
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddScreenFunction, setShowAddScreenFunction] = useState(false);
  const [editingScreenFunction, setEditingScreenFunction] =
    useState<ScreenFunction | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showCopyMembers, setShowCopyMembers] = useState(false);
  const [showCopyScreenFunctions, setShowCopyScreenFunctions] = useState(false);
  const [sfSourceProject, setSFSourceProject] = useState<number | null>(null);
  const [selectedSFIds, setSelectedSFIds] = useState<number[]>([]);
  const [copySFAutoCreateSteps, setCopySFAutoCreateSteps] = useState(false);
  const [linkingMemberId, setLinkingMemberId] = useState<number | null>(null);
  const [selectedSourceProject, setSelectedSourceProject] = useState<
    number | null
  >(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [sfFilter, setSfFilter] = useState<{
    type: string;
    status: string;
    search: string;
  }>({
    type: "",
    status: "",
    search: "",
  });
  const [expandedStages, setExpandedStages] = useState<number | null>(null);
  const [showAIScheduling, setShowAIScheduling] = useState(false);
  const [showAIPlanAll, setShowAIPlanAll] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [metricSummaryFilter, setMetricSummaryFilter] = useState<{
    search: string;
    stageId: string;
    showOnlyWithMetrics: boolean;
  }>({
    search: "",
    stageId: "",
    showOnlyWithMetrics: true,
  });
  const [metricReportView, setMetricReportView] = useState<
    "dashboard" | "details"
  >("dashboard");
  const [memberFilter, setMemberFilter] = useState<{
    role: string;
    status: string;
    search: string;
  }>({
    role: "",
    status: "",
    search: "",
  });
  const [effortUnit, setEffortUnit] = useState<EffortUnit>(() => {
    const stored = localStorage.getItem(
      `effortUnit.project.${projectId}`,
    ) as EffortUnit | null;
    return stored || "man-hour";
  });
  const [effortUnitReady, setEffortUnitReady] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    workingHoursPerDay: 8,
    workingDaysPerMonth: 20,
    defaultEffortUnit: "man-hour" as EffortUnit,
    nonWorkingDays: DEFAULT_NON_WORKING_DAYS as number[],
    holidays: [] as string[],
  });
  const [newHoliday, setNewHoliday] = useState("");
  const [showHolidayImport, setShowHolidayImport] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getOne(parseInt(projectId));
      return response.data;
    },
  });

  const { data: stagesOverview } = useQuery({
    queryKey: ["stagesOverview", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: screenFunctions } = useQuery({
    queryKey: ["screenFunctions", parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getByProject(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: sfStageStats } = useQuery({
    queryKey: ["sfStageStats", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getScreenFunctionStageStats(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: sfSummary } = useQuery({
    queryKey: ["screenFunctionSummary", parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getSummary(parseInt(projectId));
      return response.data;
    },
  });

  const { data: defaultMembers } = useQuery({
    queryKey: ["sfDefaultMembers", parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getDefaultMembersByProject(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getByProjectWithUser(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: linkableUsers } = useQuery({
    queryKey: ["linkableUsers"],
    queryFn: async () => {
      const response = await memberApi.getLinkableUsers();
      return response.data;
    },
  });

  const { data: memberSummary } = useQuery({
    queryKey: ["memberSummary", parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getSummary(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectWorkload } = useQuery({
    queryKey: ["projectWorkload", parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getProjectWorkload(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectSettings } = useQuery({
    queryKey: ["projectSettings", parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getSettings(parseInt(projectId));
      return response.data;
    },
  });

  // Get real-time metrics for project status
  const { data: projectMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["projectMetrics", parseInt(projectId)],
    queryFn: async () => {
      const response = await metricsApi.getProjectRealTime(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectMetricInsights } = useQuery({
    queryKey: ["projectMetricInsights", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectMetricInsights(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  const { data: projectMetricTypeSummary } = useQuery({
    queryKey: ["projectMetricTypeSummary", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectMetricTypeSummary(
        parseInt(projectId),
      );
      return response.data;
    },
  });

  // Mutation to refresh/update project status
  const refreshStatusMutation = useMutation({
    mutationFn: () => metricsApi.refreshProjectStatus(parseInt(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["projectMetrics", parseInt(projectId)],
      });
    },
  });

  // Get all projects for copy members dropdown
  const { data: allProjects } = useQuery({
    queryKey: ["allProjects"],
    queryFn: async () => {
      const response = await projectApi.getAll();
      return response.data;
    },
  });

  // Get members from selected source project for copying
  const { data: sourceProjectMembers } = useQuery({
    queryKey: ["sourceProjectMembers", selectedSourceProject],
    queryFn: async () => {
      if (!selectedSourceProject) return [];
      const response = await memberApi.getByProject(selectedSourceProject);
      return response.data;
    },
    enabled: !!selectedSourceProject,
  });

  // Get screen functions from selected source project for copying
  const { data: sourceSFs } = useQuery({
    queryKey: ["sourceSFs", sfSourceProject],
    queryFn: async () => {
      if (!sfSourceProject) return [];
      const response = await screenFunctionApi.getByProject(sfSourceProject);
      return response.data;
    },
    enabled: !!sfSourceProject,
  });

  // Sync settings form with fetched project settings
  useEffect(() => {
    if (projectSettings) {
      const storedEffortUnit = localStorage.getItem(
        `effortUnit.project.${projectId}`,
      ) as EffortUnit | null;
      setSettingsForm({
        workingHoursPerDay:
          projectSettings.workingHoursPerDay ||
          DEFAULT_WORK_SETTINGS.workingHoursPerDay,
        workingDaysPerMonth:
          projectSettings.workingDaysPerMonth ||
          DEFAULT_WORK_SETTINGS.workingDaysPerMonth,
        defaultEffortUnit:
          projectSettings.defaultEffortUnit ||
          DEFAULT_WORK_SETTINGS.defaultEffortUnit,
        nonWorkingDays:
          projectSettings.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: projectSettings.holidays || [],
      });
      setEffortUnit(
        storedEffortUnit ||
          projectSettings.defaultEffortUnit ||
          DEFAULT_WORK_SETTINGS.defaultEffortUnit,
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
  const displayEffort = (
    value: number,
    sourceUnit: EffortUnit = "man-hour",
  ) => {
    const converted = convertEffort(
      value,
      sourceUnit,
      effortUnit,
      settingsForm,
    );
    return formatEffort(converted, effortUnit);
  };

  const formatMetricValue = (value?: number, digits = 2) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return t("common.notAvailable");
    }
    return value.toFixed(digits);
  };

  const formatPercentValue = (value?: number, digits = 1) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return t("common.notAvailable");
    }
    return `${value.toFixed(digits)}%`;
  };

  const projectTestInsights = projectMetricInsights?.project;

  const deleteScreenFunctionMutation = useMutation({
    mutationFn: (id: number) => screenFunctionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["screenFunctions", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["screenFunctionSummary", parseInt(projectId)],
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => memberApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["members", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberSummary", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["projectWorkload", parseInt(projectId)],
      });
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: (data: { memberId: number; userId: number | null }) =>
      memberApi.linkToUser(data.memberId, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["members", parseInt(projectId)],
      });
      setLinkingMemberId(null);
    },
  });

  const copyMembersMutation = useMutation({
    mutationFn: (data: {
      sourceProjectId: number;
      targetProjectId: number;
      memberIds: number[];
    }) => memberApi.copyFromProject(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["members", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberSummary", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["projectWorkload", parseInt(projectId)],
      });
      setShowCopyMembers(false);
      setSelectedSourceProject(null);
      setSelectedMemberIds([]);
      // Show success message
      alert(
        `Copied ${result.data.copied} member(s). ${result.data.skipped > 0 ? `${result.data.skipped} skipped (already exist).` : ""}`,
      );
    },
  });

  const copySFMutation = useMutation({
    mutationFn: (data: {
      sourceProjectId: number;
      targetProjectId: number;
      screenFunctionIds: number[];
      autoCreateSteps?: boolean;
    }) => screenFunctionApi.copyFromProject(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["screenFunctions", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["screenFunctionSummary", parseInt(projectId)],
      });
      queryClient.invalidateQueries({
        queryKey: ["sfStageStats", parseInt(projectId)],
      });
      setShowCopyScreenFunctions(false);
      setSFSourceProject(null);
      setSelectedSFIds([]);
      setCopySFAutoCreateSteps(false);
      alert(
        `Copied ${result.data.copied} item(s).${result.data.skipped > 0 ? ` ${result.data.skipped} skipped (already exist).` : ""}`,
      );
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectApi.delete(parseInt(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<ProjectSettings>) =>
      projectApi.updateSettings(parseInt(projectId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projectSettings", parseInt(projectId)],
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const tabs: Array<{ id: ProjectTab; name: string }> = [
    { id: "overview" as const, name: t("stages.overviewTab") },
    { id: "timeline" as const, name: t("stages.timelineTitle") },
    { id: "stages" as const, name: t("stages.title") },
    { id: "screen-functions" as const, name: t("nav.screenFunctions") },
    { id: "members" as const, name: t("nav.members") },
    { id: "task-workflow" as const, name: t("taskWorkflow.title") },
    { id: "metric-summary" as const, name: t("metrics.metricTypesReport") },
    { id: "settings" as const, name: t("nav.settings") },
  ];

  const handleTabChange = useCallback(
    (tabId: ProjectTab) => {
      if (tabId === activeTab) return;
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
        search: (prev) => ({ ...prev, tab: tabId }),
        replace: true,
      });
    },
    [activeTab, navigate, projectId],
  );

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
        <p className="text-gray-500">{t("project.noProjects")}</p>
      </div>
    );
  }

  // Filter screen functions
  const filteredScreenFunctions = screenFunctions?.filter((sf) => {
    if (sfFilter.type && sf.type !== sfFilter.type) return false;
    if (sfFilter.status && sf.status !== sfFilter.status) return false;
    if (
      sfFilter.search &&
      !sf.name.toLowerCase().includes(sfFilter.search.toLowerCase())
    )
      return false;
    return true;
  });

  // Filter members
  const filteredMembers = members?.filter((m) => {
    if (memberFilter.role && m.role !== memberFilter.role) return false;
    if (memberFilter.status && m.status !== memberFilter.status) return false;
    if (
      memberFilter.search &&
      !m.name.toLowerCase().includes(memberFilter.search.toLowerCase())
    )
      return false;
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
              {t("project.edit")}
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              {t("project.delete")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6">
          {/* Effort Unit Selector */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <span className="text-sm text-gray-500">
              {t("settings.defaultEffortUnit")}:
            </span>
            <EffortUnitSelector value={effortUnit} onChange={setEffortUnit} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t("common.status")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={project.status as any} />
                    {projectMetrics &&
                      project.status !== projectMetrics.evaluatedStatus && (
                        <button
                          onClick={() => refreshStatusMutation.mutate()}
                          disabled={refreshStatusMutation.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                          title={t("metrics.statusChanged")}
                        >
                          {refreshStatusMutation.isPending
                            ? t("common.loading")
                            : t("common.update")}
                        </button>
                      )}
                  </div>
                </div>
              </div>
              {/* Status reason hint */}
              {projectMetrics?.statusReasons && (
                <div className="mt-2 text-xs">
                  {projectMetrics.statusReasons
                    .filter((r: any) => r.type !== "good")
                    .slice(0, 1)
                    .map((r: any, i: number) => (
                      <span
                        key={i}
                        className={
                          r.type === "risk" ? "text-red-600" : "text-yellow-600"
                        }
                      >
                        {r.message}
                      </span>
                    ))}
                  {projectMetrics.statusReasons.every(
                    (r: any) => r.type === "good",
                  ) && (
                    <span className="text-green-600">
                      {t("metrics.allMetricsGood")}
                    </span>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <p className="text-sm text-gray-500">{t("common.progress")}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {project.progress.toFixed(1)}%
              </p>
              <ProgressBar progress={project.progress} />
            </Card>

            <Card>
              <p className="text-sm text-gray-500">
                {t("project.estimatedEffort")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(project.estimatedEffort, "man-month")}{" "}
                <span className="text-sm text-gray-500">
                  {EFFORT_UNIT_LABELS[effortUnit]}
                </span>
              </p>
            </Card>

            <Card>
              <p className="text-sm text-gray-500">
                {t("project.actualEffort")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {displayEffort(project.actualEffort, "man-month")}{" "}
                <span className="text-sm text-gray-500">
                  {EFFORT_UNIT_LABELS[effortUnit]}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {project.actualEffort > project.estimatedEffort ? (
                  <span className="text-red-600">
                    +
                    {displayEffort(
                      project.actualEffort - project.estimatedEffort,
                      "man-month",
                    )}{" "}
                    {EFFORT_UNIT_LABELS[effortUnit]} over
                  </span>
                ) : (
                  <span className="text-green-600">
                    {displayEffort(
                      project.estimatedEffort - project.actualEffort,
                      "man-month",
                    )}{" "}
                    {EFFORT_UNIT_LABELS[effortUnit]} remaining
                  </span>
                )}
              </p>
            </Card>
          </div>

          {/* Project Health Metrics */}
          {projectMetrics && (
            <Card
              title={t("report.overallHealth")}
              actions={
                <button
                  onClick={() => refetchMetrics()}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {t("common.update")}
                </button>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {/* SPI */}
                <div
                  className={`p-3 rounded-lg ${
                    projectMetrics.schedule.spi >= 0.95
                      ? "bg-green-50"
                      : projectMetrics.schedule.spi >= 0.8
                        ? "bg-yellow-50"
                        : "bg-red-50"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">
                    {t("metrics.spi")} ({t("metrics.schedulePerformance")})
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      projectMetrics.schedule.spi >= 0.95
                        ? "text-green-700"
                        : projectMetrics.schedule.spi >= 0.8
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {projectMetrics.schedule.spi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Target: ≥ 0.95</p>
                </div>

                {/* CPI */}
                <div
                  className={`p-3 rounded-lg ${
                    projectMetrics.schedule.cpi >= 0.95
                      ? "bg-green-50"
                      : projectMetrics.schedule.cpi >= 0.8
                        ? "bg-yellow-50"
                        : "bg-red-50"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">
                    {t("metrics.cpi")} ({t("metrics.costPerformance")})
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      projectMetrics.schedule.cpi >= 0.95
                        ? "text-green-700"
                        : projectMetrics.schedule.cpi >= 0.8
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {projectMetrics.schedule.cpi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Target: ≥ 0.95</p>
                </div>

                {/* Delay Rate */}
                <div
                  className={`p-3 rounded-lg ${
                    projectMetrics.schedule.delayRate <= 5
                      ? "bg-green-50"
                      : projectMetrics.schedule.delayRate <= 20
                        ? "bg-yellow-50"
                        : "bg-red-50"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">
                    {t("metrics.delayRate")}
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      projectMetrics.schedule.delayRate <= 5
                        ? "text-green-700"
                        : projectMetrics.schedule.delayRate <= 20
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {projectMetrics.schedule.delayRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">Target: ≤ 5%</p>
                </div>
              </div>

              {/* Status Reasons */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t("metrics.evaluationDetails")}:
                </p>
                <div className="space-y-2">
                  {projectMetrics.statusReasons.map(
                    (reason: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${
                          reason.type === "good"
                            ? "text-green-700"
                            : reason.type === "warning"
                              ? "text-yellow-700"
                              : "text-red-700"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            reason.type === "good"
                              ? "bg-green-500"
                              : reason.type === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">
                          {reason.metricKey
                            ? t(`metrics.reason.metric.${reason.metricKey}`)
                            : reason.metric}
                          :
                        </span>
                        <span>
                          {reason.messageKey
                            ? t(
                                `metrics.reason.message.${reason.messageKey}`,
                                reason.data || {},
                              )
                            : reason.message}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span>{t("metrics.good")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-500"></span>
                  <span>{t("metrics.warning")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span>{t("metrics.atRisk")}</span>
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
              onClick={() => handleTabChange(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <ProjectOverviewTab
          project={project}
          projectMetrics={projectMetrics}
          projectTestInsights={projectTestInsights}
          stagesOverview={stagesOverview}
          projectId={projectId}
          effortUnit={effortUnit}
          displayEffort={displayEffort}
          formatMetricValue={formatMetricValue}
          formatPercentValue={formatPercentValue}
          handleTabChange={handleTabChange}
        />
      )}

      {activeTab === "timeline" && (
        <ProjectTimelineTab
          stagesOverview={stagesOverview}
          projectId={projectId}
        />
      )}

      {activeTab === "stages" && (
        <ProjectStagesTab
          projectId={projectId}
          effortUnit={effortUnit}
          workSettings={settingsForm}
          setShowAIPlanAll={setShowAIPlanAll}
          setShowAIScheduling={setShowAIScheduling}
        />
      )}

      {activeTab === "screen-functions" && (
        <ProjectScreenFunctionsTab
          sfSummary={sfSummary}
          sfStageStats={sfStageStats}
          filteredScreenFunctions={filteredScreenFunctions}
          expandedStages={expandedStages}
          setExpandedStages={setExpandedStages}
          expandedSteps={expandedSteps}
          setExpandedSteps={setExpandedSteps}
          sfFilter={sfFilter}
          setSfFilter={setSfFilter}
          defaultMembers={defaultMembers}
          members={members}
          effortUnit={effortUnit}
          displayEffort={displayEffort}
          setShowAddScreenFunction={setShowAddScreenFunction}
          setShowCopyScreenFunctions={setShowCopyScreenFunctions}
          setEditingScreenFunction={setEditingScreenFunction}
          deleteScreenFunctionMutation={deleteScreenFunctionMutation}
        />
      )}

      {activeTab === "members" && (
        <ProjectMembersTab
          memberSummary={memberSummary}
          filteredMembers={filteredMembers}
          memberFilter={memberFilter}
          setMemberFilter={setMemberFilter}
          getMemberWorkload={getMemberWorkload}
          setShowAddMember={setShowAddMember}
          setShowCopyMembers={setShowCopyMembers}
          setEditingMember={setEditingMember}
          setLinkingMemberId={setLinkingMemberId}
          linkUserMutation={linkUserMutation}
          deleteMemberMutation={deleteMemberMutation}
          effortUnit={effortUnit}
          displayEffort={displayEffort}
        />
      )}

      {activeTab === "task-workflow" && (
        <ProjectTaskWorkflowTab
          projectId={projectId}
          members={members}
        />
      )}

      {activeTab === "metric-summary" && (
        <ProjectMetricSummaryTab
          projectMetricTypeSummary={projectMetricTypeSummary}
          metricReportView={metricReportView}
          setMetricReportView={setMetricReportView}
          metricSummaryFilter={metricSummaryFilter}
          setMetricSummaryFilter={setMetricSummaryFilter}
        />
      )}

      {activeTab === "settings" && (
        <ProjectSettingsTab
          projectId={projectId}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          newHoliday={newHoliday}
          setNewHoliday={setNewHoliday}
          showHolidayImport={showHolidayImport}
          setShowHolidayImport={setShowHolidayImport}
          updateSettingsMutation={updateSettingsMutation}
          handleSaveSettings={handleSaveSettings}
        />
      )}

      {/* Modals */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title={t("project.edit")}
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
        isOpen={showAddScreenFunction || !!editingScreenFunction}
        onClose={() => {
          setShowAddScreenFunction(false);
          setEditingScreenFunction(null);
        }}
        title={
          editingScreenFunction
            ? t("screenFunction.edit")
            : t("screenFunction.create")
        }
      >
        <ScreenFunctionForm
          projectId={parseInt(projectId)}
          screenFunction={editingScreenFunction || undefined}
          effortUnit={effortUnit}
          workSettings={settingsForm}
          nextDisplayOrder={(screenFunctions?.length || 0) + 1}
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
        title={editingMember ? t("member.edit") : t("member.create")}
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

      {/* Link User Modal */}
      <Modal
        isOpen={linkingMemberId !== null}
        onClose={() => setLinkingMemberId(null)}
        title={t("member.linkUser")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("member.linkUserDescription")}
          </p>
          <p className="text-xs text-gray-400">
            {t("member.onlyMemberPermission")}
          </p>
          {linkableUsers && linkableUsers.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {linkableUsers.map((user) => {
                const alreadyLinked = members?.some(
                  (m) => m.userId === user.id && m.id !== linkingMemberId,
                );
                return (
                  <button
                    key={user.id}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      alreadyLinked
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                    }`}
                    disabled={alreadyLinked}
                    onClick={() => {
                      if (linkingMemberId && !alreadyLinked) {
                        linkUserMutation.mutate({
                          memberId: linkingMemberId,
                          userId: user.id,
                        });
                      }
                    }}
                  >
                    <p className="font-medium text-sm">{user.username}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500">{user.email}</p>
                    )}
                    {alreadyLinked && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("member.alreadyExists")}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("common.noData")}</p>
          )}
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
        title={t("member.copyFromProject")}
        size="lg"
      >
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <Select
              label={t("member.selectSourceProject")}
              value={selectedSourceProject || ""}
              onChange={(e) => {
                setSelectedSourceProject(
                  e.target.value ? parseInt(e.target.value as string) : null,
                );
                setSelectedMemberIds([]);
              }}
              options={[
                { value: "", label: t("member.selectProject") },
                ...(allProjects
                  ?.filter((p) => p.id !== parseInt(projectId))
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []),
              ]}
            />
          </div>

          {/* Member Selection */}
          {selectedSourceProject && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t("member.selectMembersToCopy")}
                </label>
                {sourceProjectMembers && sourceProjectMembers.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-dark"
                    onClick={() => {
                      if (
                        selectedMemberIds.length === sourceProjectMembers.length
                      ) {
                        setSelectedMemberIds([]);
                      } else {
                        setSelectedMemberIds(
                          sourceProjectMembers.map((m) => m.id),
                        );
                      }
                    }}
                  >
                    {selectedMemberIds.length === sourceProjectMembers?.length
                      ? t("member.deselectAll")
                      : t("member.selectAll")}
                  </button>
                )}
              </div>

              {sourceProjectMembers && sourceProjectMembers.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {sourceProjectMembers.map((member) => {
                    const isExisting = members?.some(
                      (m) =>
                        m.name.toLowerCase() === member.name.toLowerCase() &&
                        (m.email?.toLowerCase() || "") ===
                          (member.email?.toLowerCase() || ""),
                    );
                    return (
                      <label
                        key={member.id}
                        className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                          isExisting ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => {
                            if (selectedMemberIds.includes(member.id)) {
                              setSelectedMemberIds(
                                selectedMemberIds.filter(
                                  (id) => id !== member.id,
                                ),
                              );
                            } else {
                              setSelectedMemberIds([
                                ...selectedMemberIds,
                                member.id,
                              ]);
                            }
                          }}
                          disabled={isExisting}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {member.name}
                            </p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded font-medium ${
                                member.role === "PM"
                                  ? "bg-purple-100 text-purple-800"
                                  : member.role === "TL"
                                    ? "bg-blue-100 text-blue-800"
                                    : member.role === "DEV"
                                      ? "bg-green-100 text-green-800"
                                      : member.role === "QA"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {member.role}
                            </span>
                            {isExisting && (
                              <span className="text-xs text-orange-600">
                                ({t("member.alreadyExists")})
                              </span>
                            )}
                          </div>
                          {member.email && (
                            <p className="text-sm text-gray-500">
                              {member.email}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              member.availability === "Full-time"
                                ? "bg-green-100 text-green-800"
                                : member.availability === "Part-time"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
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
                  {t("member.noMembersInProject")}
                </div>
              )}
            </div>
          )}

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedMemberIds.length > 0 && (
                <span>
                  <strong>{selectedMemberIds.length}</strong>{" "}
                  {t("member.membersSelected")}
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
                {t("common.cancel")}
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
                disabled={
                  !selectedSourceProject || selectedMemberIds.length === 0
                }
                loading={copyMembersMutation.isPending}
              >
                {t("member.copy")}{" "}
                {selectedMemberIds.length > 0
                  ? `(${selectedMemberIds.length})`
                  : ""}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Copy Screen Functions Modal */}
      <Modal
        isOpen={showCopyScreenFunctions}
        onClose={() => {
          setShowCopyScreenFunctions(false);
          setSFSourceProject(null);
          setSelectedSFIds([]);
          setCopySFAutoCreateSteps(false);
        }}
        title={t("screenFunction.copyFromProject")}
        size="lg"
      >
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <Select
              label={t("screenFunction.selectSourceProject")}
              value={sfSourceProject || ""}
              onChange={(e) => {
                setSFSourceProject(
                  e.target.value ? parseInt(e.target.value as string) : null,
                );
                setSelectedSFIds([]);
              }}
              options={[
                { value: "", label: t("screenFunction.selectProject") },
                ...(allProjects
                  ?.filter((p) => p.id !== parseInt(projectId))
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []),
              ]}
            />
          </div>

          {/* Screen Function Selection */}
          {sfSourceProject && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t("screenFunction.selectItemsToCopy")}
                </label>
                {sourceSFs && sourceSFs.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-dark"
                    onClick={() => {
                      if (selectedSFIds.length === sourceSFs.length) {
                        setSelectedSFIds([]);
                      } else {
                        setSelectedSFIds(sourceSFs.map((sf) => sf.id));
                      }
                    }}
                  >
                    {selectedSFIds.length === sourceSFs.length
                      ? t("screenFunction.deselectAll")
                      : t("screenFunction.selectAll")}
                  </button>
                )}
              </div>

              {sourceSFs && sourceSFs.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {sourceSFs.map((sf) => {
                    const isExisting = screenFunctions?.some(
                      (existing) =>
                        existing.name.toLowerCase() === sf.name.toLowerCase(),
                    );
                    return (
                      <label
                        key={sf.id}
                        className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                          isExisting ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSFIds.includes(sf.id)}
                          onChange={() => {
                            if (selectedSFIds.includes(sf.id)) {
                              setSelectedSFIds(
                                selectedSFIds.filter((id) => id !== sf.id),
                              );
                            } else {
                              setSelectedSFIds([...selectedSFIds, sf.id]);
                            }
                          }}
                          disabled={isExisting}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {sf.name}
                            </p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded font-medium ${
                                sf.type === "Screen"
                                  ? "bg-purple-100 text-purple-800"
                                  : sf.type === "Function"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {sf.type}
                            </span>
                            {isExisting && (
                              <span className="text-xs text-orange-600">
                                ({t("screenFunction.alreadyExists")})
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                            <span>{t("screenFunction.priority")}: {sf.priority}</span>
                            <span>{t("screenFunction.complexity")}: {sf.complexity}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t("screenFunction.noItemsInProject")}
                </div>
              )}
            </div>
          )}

          {/* Auto-create steps flag */}
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={copySFAutoCreateSteps}
              onChange={(e) => setCopySFAutoCreateSteps(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {t("screenFunction.autoCreateSteps")}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("screenFunction.autoCreateStepsHint")}
              </p>
            </div>
          </label>

          {/* Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedSFIds.length > 0 && (
                <span>
                  <strong>{selectedSFIds.length}</strong>{" "}
                  {t("screenFunction.itemsSelected")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCopyScreenFunctions(false);
                  setSFSourceProject(null);
                  setSelectedSFIds([]);
                  setCopySFAutoCreateSteps(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (sfSourceProject && selectedSFIds.length > 0) {
                    copySFMutation.mutate({
                      sourceProjectId: sfSourceProject,
                      targetProjectId: parseInt(projectId),
                      screenFunctionIds: selectedSFIds,
                      autoCreateSteps: copySFAutoCreateSteps,
                    });
                  }
                }}
                disabled={!sfSourceProject || selectedSFIds.length === 0}
                loading={copySFMutation.isPending}
              >
                {t("screenFunction.copyAction")}{" "}
                {selectedSFIds.length > 0 ? `(${selectedSFIds.length})` : ""}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t("project.delete")}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t("project.deleteConfirm")} <strong>"{project.name}"</strong>?
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-red-800 font-medium">
                  {t("common.warning")}
                </p>
                <p className="text-red-700 text-sm mt-1">
                  {t("project.deleteWarning")}
                </p>
                <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
                  <li>{t("project.deleteWarningScreenFunctions")}</li>
                  <li>{t("project.deleteWarningMembers")}</li>
                  <li>{t("project.deleteWarningReports")}</li>
                  <li>{t("project.deleteWarningTesting")}</li>
                </ul>
                <p className="text-red-700 text-sm mt-2 font-medium">
                  {t("project.deleteIrreversible")}
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
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteProjectMutation.mutate()}
              loading={deleteProjectMutation.isPending}
            >
              {t("project.delete")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Scheduling Dialog */}
      <AISchedulingDialog
        open={showAIScheduling}
        onClose={() => setShowAIScheduling(false)}
        projectId={parseInt(projectId)}
        stages={(stagesOverview || []).map((s: any) => ({ id: s.id, name: s.name }))}
      />

      {/* AI Plan All Dialog */}
      <AIPlanAllDialog
        open={showAIPlanAll}
        onClose={() => setShowAIPlanAll(false)}
        projectId={parseInt(projectId)}
        stages={(stagesOverview || []).map((s: any) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
