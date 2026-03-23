import { useState } from "react";
import { Button } from "@/components/common";
import { StagesOverviewPanel } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { EffortUnit, StageOverviewData } from "@/types";
import { taskWorkflowApi } from "@/services/api";
import { exportStagesToExcel } from "@/utils/exportUtils";
import { convertEffort, formatEffort } from "@/utils/effortUtils";
import { useQuery } from "@tanstack/react-query";

interface ProjectStagesTabProps {
  projectId: string;
  projectName?: string;
  effortUnit: EffortUnit;
  workSettings: any;
  setShowAIPlanAll: (show: boolean) => void;
  setShowAIScheduling: (show: boolean) => void;
}

export function ProjectStagesTab({
  projectId,
  projectName,
  effortUnit,
  workSettings,
  setShowAIPlanAll,
  setShowAIScheduling,
}: ProjectStagesTabProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const { data: stagesOverview } = useQuery({
    queryKey: ["stagesOverview", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(parseInt(projectId));
      return response.data;
    },
  });

  const displayEffort = (v: number, src: EffortUnit) => {
    const converted = convertEffort(v, src, effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
  };

  const handleExportExcel = async () => {
    if (!stagesOverview || stagesOverview.length === 0) return;
    setExporting(true);
    try {
      const detailResults = await Promise.all(
        stagesOverview.map((s: StageOverviewData) => taskWorkflowApi.getStageDetail(s.id))
      );
      const stagesDetail = detailResults.map((r: { data: any }) => r.data);
      await exportStagesToExcel({
        projectName: projectName ?? projectId,
        stagesOverview,
        stagesDetail,
        effortUnit,
        displayEffort,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="secondary"
          onClick={handleExportExcel}
          disabled={exporting}
        >
          {exporting
            ? t("common.exporting", "Exporting...")
            : t("stages.exportExcel", "Export Excel")}
        </Button>
        <Button variant="primary" onClick={() => setShowAIPlanAll(true)}>
          {t('ai.planAll', 'AI Plan Everything')}
        </Button>
        <Button variant="secondary" onClick={() => setShowAIScheduling(true)}>
          {t('ai.advancedOptions', 'Advanced AI Options')}
        </Button>
      </div>
      <StagesOverviewPanel
        projectId={parseInt(projectId)}
        effortUnit={effortUnit}
        workSettings={workSettings}
      />
    </div>
  );
}
