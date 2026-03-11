import { Card, Button, Input, Select, ProgressBar, EmptyState } from "@/components/common";
import { useTranslation } from "react-i18next";
import type { EffortUnit, ScreenFunction } from "@/types";
import { EFFORT_UNIT_LABELS } from "@/utils/effortUtils";

interface ProjectScreenFunctionsTabProps {
  sfSummary: any;
  sfStageStats: any[] | undefined;
  filteredScreenFunctions: ScreenFunction[] | undefined;
  expandedStages: number | null;
  setExpandedStages: (id: number | null) => void;
  expandedSteps: Set<string>;
  setExpandedSteps: (steps: Set<string>) => void;
  sfFilter: { type: string; status: string; search: string };
  setSfFilter: (filter: { type: string; status: string; search: string }) => void;
  defaultMembers: any[] | undefined;
  members: any[] | undefined;
  effortUnit: EffortUnit;
  displayEffort: (value: number, sourceUnit: EffortUnit) => string;
  setShowAddScreenFunction: (show: boolean) => void;
  setShowCopyScreenFunctions: (show: boolean) => void;
  setEditingScreenFunction: (sf: ScreenFunction | null) => void;
  deleteScreenFunctionMutation: { mutate: (id: number) => void };
}

export function ProjectScreenFunctionsTab({
  sfSummary,
  sfStageStats,
  filteredScreenFunctions,
  expandedStages,
  setExpandedStages,
  sfFilter,
  setSfFilter,
  defaultMembers,
  members,
  effortUnit,
  displayEffort,
  setShowAddScreenFunction,
  setShowCopyScreenFunctions,
  setEditingScreenFunction,
  deleteScreenFunctionMutation,
}: ProjectScreenFunctionsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {sfSummary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">{t("common.total")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {sfSummary.total}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {sfSummary.byType.Screen} {t("screenFunction.typeScreen")},{" "}
              {sfSummary.byType.Function} {t("screenFunction.typeFunction")}
              {sfSummary.byType.Other ? `, ${sfSummary.byType.Other} Other` : ""}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("project.estimatedEffort")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {displayEffort(sfSummary.totalEstimated, "man-hour")}{" "}
              <span className="text-sm text-gray-500">
                {EFFORT_UNIT_LABELS[effortUnit]}
              </span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("screenFunction.actualEffort")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {displayEffort(sfSummary.totalActual, "man-hour")}{" "}
              <span className="text-sm text-gray-500">
                {EFFORT_UNIT_LABELS[effortUnit]}
              </span>
            </p>
            {sfSummary.variance !== 0 && (
              <p
                className={`text-xs mt-1 ${sfSummary.variance > 0 ? "text-red-600" : "text-green-600"}`}
              >
                {sfSummary.variance > 0 ? "+" : ""}
                {displayEffort(sfSummary.variance, "man-hour")}{" "}
                {EFFORT_UNIT_LABELS[effortUnit]} (
                {sfSummary.variancePercentage.toFixed(1)}%)
              </p>
            )}
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("screenFunction.averageProgress")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {sfSummary.avgProgress.toFixed(1)}%
            </p>
            <ProgressBar progress={sfSummary.avgProgress} />
          </Card>
        </div>
      )}

      {/* Status breakdown */}
      {sfSummary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-400">
              {sfSummary.byStatus["Not Started"]}
            </p>
            <p className="text-sm text-gray-500">
              {t("screenFunction.statusNotStarted")}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">
              {sfSummary.byStatus["In Progress"]}
            </p>
            <p className="text-sm text-gray-500">
              {t("screenFunction.statusInProgress")}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">
              {sfSummary.byStatus["Completed"]}
            </p>
            <p className="text-sm text-gray-500">
              {t("screenFunction.statusCompleted")}
            </p>
          </div>
        </div>
      )}

      {/* Stage / Step Breakdown */}
      {sfStageStats &&
        sfStageStats.length > 0 &&
        (() => {
          const selectedStage = sfStageStats.find(
            (s) => s.stageId === expandedStages,
          );
          return (
            <div className="space-y-3">
              {/* Stage Grid Cards */}
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(sfStageStats.length, 4)}, minmax(0, 1fr))`,
                }}
              >
                {sfStageStats.map((stage) => {
                  const isSelected = expandedStages === stage.stageId;
                  return (
                    <div
                      key={stage.stageId}
                      className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() =>
                        setExpandedStages(isSelected ? null : stage.stageId)
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {stage.stageColor && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.stageColor }}
                          />
                        )}
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {stage.stageName}
                        </span>
                      </div>
                      <div className="mb-2">
                        <ProgressBar progress={stage.progress} showLabel />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{stage.totalTasks} tasks</span>
                        <div className="flex gap-1">
                          <span className="px-1 py-0.5 rounded bg-green-100 text-green-700">
                            {stage.completedTasks}
                          </span>
                          <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                            {stage.inProgressTasks}
                          </span>
                          <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                            {stage.pendingTasks}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 text-xs text-gray-400 text-right">
                        {displayEffort(stage.estimatedEffort, "man-hour")} /{" "}
                        {displayEffort(stage.actualEffort, "man-hour")}{" "}
                        {EFFORT_UNIT_LABELS[effortUnit]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel */}
              {selectedStage && (
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      {selectedStage.stageColor && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedStage.stageColor }}
                        />
                      )}
                      <span>{selectedStage.stageName}</span>
                      <span className="text-sm font-normal text-gray-500">
                        — {selectedStage.linkedScreensCount} screens,{" "}
                        {selectedStage.totalTasks} tasks
                      </span>
                    </div>
                  }
                >
                  {(() => {
                    // Aggregate all unique screen/functions across all steps in this stage
                    const screenMap = new Map<
                      number,
                      {
                        screenFunctionId: number;
                        screenFunctionName: string;
                        screenFunctionType: string;
                        displayOrder: number;
                        byStep: Map<number, { actualEffort: number; estimatedEffort: number; status: string; members: { memberId: number; memberName: string; actualEffort: number }[] }>;
                        // unique members across all steps: memberId → { name, totalActual }
                        memberMap: Map<number, { memberName: string; totalActual: number }>;
                        totalActual: number;
                        totalEstimated: number;
                      }
                    >();

                    for (const step of selectedStage.steps) {
                      for (const sf of step.screenFunctions) {
                        if (!screenMap.has(sf.screenFunctionId)) {
                          screenMap.set(sf.screenFunctionId, {
                            screenFunctionId: sf.screenFunctionId,
                            screenFunctionName: sf.screenFunctionName,
                            screenFunctionType: sf.screenFunctionType,
                            displayOrder: sf.displayOrder ?? 9999,
                            byStep: new Map(),
                            memberMap: new Map(),
                            totalActual: 0,
                            totalEstimated: 0,
                          });
                        }
                        const entry = screenMap.get(sf.screenFunctionId)!;
                        entry.byStep.set(step.stepId, {
                          actualEffort: sf.actualEffort,
                          estimatedEffort: sf.estimatedEffort,
                          status: sf.status,
                          members: sf.members || [],
                        });
                        entry.totalActual += sf.actualEffort;
                        entry.totalEstimated += sf.estimatedEffort;
                        // Aggregate unique members
                        for (const m of (sf.members || [])) {
                          const existing = entry.memberMap.get(m.memberId);
                          if (existing) {
                            existing.totalActual += m.actualEffort;
                          } else {
                            entry.memberMap.set(m.memberId, {
                              memberName: m.memberName,
                              totalActual: m.actualEffort,
                            });
                          }
                        }
                      }
                    }

                    const screens = Array.from(screenMap.values()).sort(
                      (a, b) => a.displayOrder - b.displayOrder,
                    );

                    if (screens.length === 0) {
                      return (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {t("taskWorkflow.noScreenFunctions")}
                        </p>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                              <th className="py-2 pl-3 pr-4 text-left font-medium sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[180px]">
                                {t("common.name")}
                              </th>
                              <th className="px-3 py-2 text-left font-medium border-r border-gray-200 w-20">
                                {t("common.type")}
                              </th>
                              <th className="px-3 py-2 text-left font-medium border-r border-gray-200 min-w-[160px]">
                                Members
                              </th>
                              {selectedStage.steps.map((step: any) => (
                                <th
                                  key={step.stepId}
                                  className="px-3 py-2 text-right font-medium border-r border-gray-200 whitespace-nowrap min-w-[80px]"
                                >
                                  {step.stepName}
                                </th>
                              ))}
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap min-w-[90px]">
                                Total ({EFFORT_UNIT_LABELS[effortUnit]})
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {screens.map((screen) => (
                              <tr key={screen.screenFunctionId} className="hover:bg-gray-50/60">
                                <td className="py-2 pl-3 pr-4 font-medium text-gray-800 sticky left-0 bg-white border-r border-gray-200">
                                  {screen.screenFunctionName}
                                </td>
                                <td className="px-3 py-2 border-r border-gray-200">
                                  <span
                                    className={`px-1.5 py-0.5 rounded ${
                                      screen.screenFunctionType === "Screen"
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {screen.screenFunctionType}
                                  </span>
                                </td>
                                <td className="px-3 py-2 border-r border-gray-200">
                                  <div className="flex flex-wrap gap-1">
                                    {Array.from(screen.memberMap.entries()).map(([memberId, m]) => (
                                      <span
                                        key={memberId}
                                        title={`${m.memberName}: ${displayEffort(m.totalActual, "man-hour")} ${EFFORT_UNIT_LABELS[effortUnit]}`}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 cursor-default"
                                      >
                                        {m.memberName}
                                      </span>
                                    ))}
                                    {screen.memberMap.size === 0 && (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </div>
                                </td>
                                {selectedStage.steps.map((step: any) => {
                                  const cell = screen.byStep.get(step.stepId);
                                  return (
                                    <td
                                      key={step.stepId}
                                      className="px-3 py-2 text-right text-gray-600 border-r border-gray-100"
                                    >
                                      {cell
                                        ? displayEffort(cell.actualEffort, "man-hour")
                                        : <span className="text-gray-300">—</span>}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                  {displayEffort(screen.totalActual, "man-hour")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-700">
                              <td className="py-2 pl-3 pr-4 sticky left-0 bg-gray-50 border-r border-gray-200">
                                Total
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200" />
                              <td className="px-3 py-2 border-r border-gray-200" />
                              {selectedStage.steps.map((step: any) => {
                                const stepTotal = step.screenFunctions.reduce(
                                  (sum: number, sf: any) => sum + sf.actualEffort,
                                  0,
                                );
                                return (
                                  <td
                                    key={step.stepId}
                                    className="px-3 py-2 text-right border-r border-gray-200"
                                  >
                                    {displayEffort(stepTotal, "man-hour")}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right">
                                {displayEffort(selectedStage.actualEffort, "man-hour")}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </Card>
              )}
            </div>
          );
        })()}

      {/* Main List */}
      <Card
        title={t("screenFunction.list")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCopyScreenFunctions(true)}
            >
              {t("screenFunction.copyFromProject")}
            </Button>
            <Button onClick={() => setShowAddScreenFunction(true)}>
              {t("screenFunction.create")}
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t("screenFunction.searchPlaceholder")}
              value={sfFilter.search}
              onChange={(e) => setSfFilter({ ...sfFilter, search: e.target.value })}
            />
          </div>
          <Select
            value={sfFilter.type}
            onChange={(e) => setSfFilter({ ...sfFilter, type: e.target.value })}
            options={[
              { value: "", label: t("screenFunction.allTypes") },
              { value: "Screen", label: t("screenFunction.typeScreen") },
              { value: "Function", label: t("screenFunction.typeFunction") },
              { value: "Other", label: t("screenFunction.typeOther", { defaultValue: "Other" }) },
            ]}
            fullWidth={false}
          />
          <Select
            value={sfFilter.status}
            onChange={(e) => setSfFilter({ ...sfFilter, status: e.target.value })}
            options={[
              { value: "", label: t("screenFunction.allStatuses") },
              { value: "Not Started", label: t("screenFunction.statusNotStarted") },
              { value: "In Progress", label: t("screenFunction.statusInProgress") },
              { value: "Completed", label: t("screenFunction.statusCompleted") },
            ]}
            fullWidth={false}
          />
        </div>

        {filteredScreenFunctions && filteredScreenFunctions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-1 text-center text-sm font-semibold text-gray-900 w-10">#</th>
                  <th className="py-3.5 pl-2 pr-3 text-left text-sm font-semibold text-gray-900">{t("common.name")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.type")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("screenFunction.priority")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("screenFunction.complexity")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.status")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.progress")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("screenFunction.effort")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    {t("screenFunction.defaultAssignees", { defaultValue: "Assignees" })}
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScreenFunctions.map((sf) => (
                  <tr key={sf.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-1 text-center text-sm text-gray-400 w-10">
                      {sf.displayOrder}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-2 pr-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{sf.name}</p>
                        {sf.description && (
                          <p className="text-gray-500 text-xs truncate max-w-xs">
                            {sf.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          sf.type === "Screen"
                            ? "bg-purple-100 text-purple-800"
                            : sf.type === "Function"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {sf.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          sf.priority === "High"
                            ? "bg-red-100 text-red-800"
                            : sf.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sf.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sf.complexity}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          sf.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : sf.status === "In Progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sf.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="w-24">
                        <ProgressBar progress={sf.progress} showLabel />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {displayEffort(sf.estimatedEffort, "man-hour")} /{" "}
                      {displayEffort(sf.actualEffort, "man-hour")}{" "}
                      {EFFORT_UNIT_LABELS[effortUnit]}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {(() => {
                        const sfDefaultMembers =
                          defaultMembers?.filter(
                            (dm) => dm.screenFunctionId === sf.id,
                          ) || [];
                        return sfDefaultMembers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {sfDefaultMembers.map((dm) => {
                              const member = members?.find((m) => m.id === dm.memberId);
                              return member ? (
                                <span
                                  key={dm.memberId}
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800"
                                >
                                  {member.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingScreenFunction(sf)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(t("screenFunction.confirmDelete"))) {
                              deleteScreenFunctionMutation.mutate(sf.id);
                            }
                          }}
                        >
                          {t("common.delete")}
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
            title={t("screenFunction.noScreenFunctions")}
            description={t("screenFunction.noScreenFunctionsDesc")}
            action={
              <Button onClick={() => setShowAddScreenFunction(true)}>
                {t("screenFunction.addFirst")}
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}
