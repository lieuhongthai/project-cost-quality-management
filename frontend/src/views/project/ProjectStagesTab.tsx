import { useState } from "react";
import { Button } from "@/components/common";
import { StagesOverviewPanel } from "@/components/task-workflow";
import { ExportFilterDialog } from "@/components/task-workflow/ExportFilterDialog";
import { useTranslation } from "react-i18next";
import type { EffortUnit, StageDetailData, StageOverviewData } from "@/types";
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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stagesDetail, setStagesDetail] = useState<StageDetailData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleOpenExportDialog = async () => {
    if (!stagesOverview || stagesOverview.length === 0) return;
    setShowExportDialog(true);
    setLoadingDetail(true);
    try {
      const detailResults = await Promise.all(
        stagesOverview.map((s: StageOverviewData) =>
          taskWorkflowApi.getStageDetail(s.id)
        )
      );
      setStagesDetail(detailResults.map((r: { data: any }) => r.data));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExport = async (
    filteredOverview: StageOverviewData[],
    filteredDetail: StageDetailData[]
  ) => {
    setExporting(true);
    try {
      await exportStagesToExcel({
        projectName: projectName ?? projectId,
        stagesOverview: filteredOverview,
        stagesDetail: filteredDetail,
        effortUnit,
        displayEffort,
      });
      setShowExportDialog(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="secondary"
          onClick={handleOpenExportDialog}
          disabled={!stagesOverview || stagesOverview.length === 0}
        >
          {t("stages.exportExcel", "Export Excel")}
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

      <ExportFilterDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        stagesOverview={stagesOverview ?? []}
        stagesDetail={stagesDetail}
        loading={loadingDetail}
        onExport={handleExport}
        exporting={exporting}
      />
    </div>
  );
}
