import { Card, Button, StatusBadge, ProgressBar, EmptyState } from "@/components/common";
import { MetricsChart } from "@/components/charts";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { EffortUnit } from "@/types";
import { EFFORT_UNIT_LABELS } from "@/utils/effortUtils";

interface ProjectOverviewTabProps {
  project: any;
  projectMetrics: any;
  projectTestInsights: any;
  stagesOverview: any[] | undefined;
  projectId: string;
  effortUnit: EffortUnit;
  displayEffort: (value: number, sourceUnit: EffortUnit) => string;
  formatMetricValue: (value?: number, digits?: number) => string;
  formatPercentValue: (value?: number, digits?: number) => string;
  handleTabChange: (tab: any) => void;
}

export function ProjectOverviewTab({
  project,
  projectMetrics,
  projectTestInsights,
  stagesOverview,
  projectId,
  effortUnit,
  displayEffort,
  formatMetricValue,
  formatPercentValue,
  handleTabChange,
}: ProjectOverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card title={t("project.overview")}>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">
              {t("project.startDate")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {format(new Date(project.startDate), "MMM dd, yyyy")}
            </dd>
          </div>
          {project.endDate && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("project.endDate")}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(project.endDate), "MMM dd, yyyy")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">
              {t("common.created")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {format(new Date(project.createdAt), "MMM dd, yyyy")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              {t("common.lastUpdated")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {format(new Date(project.updatedAt), "MMM dd, yyyy")}
            </dd>
          </div>
        </dl>
      </Card>

      {projectMetrics && (
        <>
          <Card title={t("metrics.kpi")}>
            <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
              <div className="rounded-lg border border-gray-200 p-4">
                <MetricsChart
                  spi={projectMetrics.schedule.spi}
                  cpi={projectMetrics.schedule.cpi}
                  delayRate={projectMetrics.schedule.delayRate}
                  tcpi={projectMetrics.forecasting.tcpi}
                  progress={project.progress}
                />
                <p className="mt-3 text-xs text-gray-500">
                  {t("metrics.evmDescription")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.spi")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.schedule.spi)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.spiFull")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.cpi")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.schedule.cpi)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.cpiFull")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.delayRate")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPercentValue(projectMetrics.schedule.delayRate, 1)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.delayRate")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.bac")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.forecasting.bac)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.bacFull")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.eac")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.forecasting.eac)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.eacFull")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.vac")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.forecasting.vac)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.vacFull")}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{t("metrics.tcpi")}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatMetricValue(projectMetrics.forecasting.tcpi)}
                  </p>
                  <p className="text-xs text-gray-400">{t("metrics.tcpiFull")}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t("metrics.qualityMetrics")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.defectRate")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMetricValue(projectMetrics.testing.defectRate, 3)}
                </p>
                <p className="text-xs text-gray-400">{t("metrics.defectsPerTestCase")}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.tasksDelayed")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercentValue(projectMetrics.schedule.delayRate, 1)}
                </p>
                <p className="text-xs text-gray-400">{t("metrics.delayInManMonths")}</p>
              </div>
            </div>
          </Card>

          <Card title={t("metrics.testMetricsProject")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.bugRate")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {projectTestInsights
                    ? formatPercentValue(projectTestInsights.bugRate * 100, 1)
                    : t("common.notAvailable")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.testCasesPerMinute")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {projectTestInsights
                    ? formatMetricValue(projectTestInsights.testCasesPerMinute, 2)
                    : t("common.notAvailable")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.totalTestCases")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {projectTestInsights
                    ? projectTestInsights.totalTestCases.toLocaleString()
                    : t("common.notAvailable")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t("metrics.bugCount")}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {projectTestInsights
                    ? projectTestInsights.bugCount.toLocaleString()
                    : t("common.notAvailable")}
                </p>
                <p className="text-xs text-gray-400">
                  {projectTestInsights
                    ? t("metrics.actualMinutes", {
                        value: formatMetricValue(projectTestInsights.actualMinutes, 0),
                      })
                    : t("common.notAvailable")}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      <Card title={t("stages.progressOverview")}>
        {stagesOverview && stagesOverview.length > 0 ? (
          <div className="space-y-4">
            {stagesOverview.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() =>
                  (window.location.href = `/projects/${projectId}/stages/${stage.id}`)
                }
              >
                <div className="flex-1">
                  <p>{stage.name}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <StatusBadge status={stage.status as any} />
                    <span className="text-sm text-gray-500">
                      {displayEffort(stage.actualEffort || 0, "man-hour")}/
                      {displayEffort(stage.estimatedEffort || 0, "man-hour")}{" "}
                      {EFFORT_UNIT_LABELS[effortUnit]}
                    </span>
                  </div>
                </div>
                <div className="w-48">
                  <ProgressBar progress={stage.progress} showLabel />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("stages.noStages")}
            description={t("stages.initializeWorkflowFirst")}
            action={
              <Button onClick={() => handleTabChange("stages")}>
                {t("stages.title")}
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}
