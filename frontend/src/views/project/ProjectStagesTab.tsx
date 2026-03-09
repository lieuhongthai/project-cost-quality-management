import { Button } from "@/components/common";
import { StagesOverviewPanel } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { EffortUnit } from "@/types";

interface ProjectStagesTabProps {
  projectId: string;
  effortUnit: EffortUnit;
  workSettings: any;
  setShowAIPlanAll: (show: boolean) => void;
  setShowAIScheduling: (show: boolean) => void;
}

export function ProjectStagesTab({
  projectId,
  effortUnit,
  workSettings,
  setShowAIPlanAll,
  setShowAIScheduling,
}: ProjectStagesTabProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
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
