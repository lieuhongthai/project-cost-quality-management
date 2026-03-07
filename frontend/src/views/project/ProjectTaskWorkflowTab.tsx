import { TaskWorkflowTable, WorklogImportPanel } from "@/components/task-workflow";

interface ProjectTaskWorkflowTabProps {
  projectId: string;
  members: any[] | undefined;
}

export function ProjectTaskWorkflowTab({ projectId, members }: ProjectTaskWorkflowTabProps) {
  return (
    <div className="space-y-6">
      <WorklogImportPanel projectId={parseInt(projectId)} />
      <TaskWorkflowTable projectId={parseInt(projectId)} members={members} />
    </div>
  );
}
