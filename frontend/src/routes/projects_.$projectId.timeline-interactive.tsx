import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { taskWorkflowApi } from '@/services/api';
import { StageTimelineSvarGantt } from '@/components/charts';
import { LoadingSpinner } from '@/components/common';

export const Route = createFileRoute('/projects_/$projectId/timeline-interactive')({
  component: TimelineInteractive,
});

function TimelineInteractive() {
  const { projectId } = Route.useParams();
  const numericProjectId = parseInt(projectId);

  const { data: stagesOverview, isLoading } = useQuery({
    queryKey: ['stagesOverview', numericProjectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(numericProjectId);
      return response.data;
    },
    enabled: !!numericProjectId,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      <StageTimelineSvarGantt stages={stagesOverview || []} projectId={numericProjectId} />
    </div>
  );
}
