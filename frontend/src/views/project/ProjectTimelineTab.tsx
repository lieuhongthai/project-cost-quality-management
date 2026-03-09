import { Card, Button } from "@/components/common";
import { StageTimelineGantt } from "@/components/charts";
import { useTranslation } from "react-i18next";

interface ProjectTimelineTabProps {
  stagesOverview: any[] | undefined;
  projectId: string;
}

export function ProjectTimelineTab({ stagesOverview, projectId }: ProjectTimelineTabProps) {
  const { t } = useTranslation();

  return (
    <Card
      title={t("stages.timelineTitle")}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            window.open(
              `/projects/${projectId}/timeline-interactive`,
              "_blank",
            )
          }
        >
          {t("stages.timelineSvarTitle")}
        </Button>
      }
    >
      <StageTimelineGantt stages={stagesOverview || []} />
    </Card>
  );
}
