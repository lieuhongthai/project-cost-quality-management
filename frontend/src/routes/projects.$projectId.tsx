import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectApi, phaseApi } from '@/services/api';
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  ProgressBar,
  Button,
  Modal,
  EmptyState,
} from '@/components/common';
import { ProjectForm, PhaseForm } from '@/components/forms';
import { format } from 'date-fns';

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'settings'>('overview');
  const [showEditProject, setShowEditProject] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getOne(parseInt(projectId));
      return response.data;
    },
  });

  const { data: phases } = useQuery({
    queryKey: ['phases', parseInt(projectId)],
    queryFn: async () => {
      const response = await phaseApi.getByProject(parseInt(projectId));
      return response.data;
    },
  });

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
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, name: 'Overview' },
    { id: 'phases' as const, name: 'Phases' },
    { id: 'settings' as const, name: 'Settings' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-2 text-gray-600">{project.description}</p>
          </div>
          <Button onClick={() => setShowEditProject(true)}>
            Edit Project
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="mt-1">
                  <StatusBadge status={project.status as any} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Progress</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {project.progress.toFixed(1)}%
            </p>
            <ProgressBar progress={project.progress} />
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Estimated Effort</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {project.estimatedEffort} <span className="text-sm text-gray-500">MM</span>
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Actual Effort</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {project.actualEffort} <span className="text-sm text-gray-500">MM</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {project.actualEffort > project.estimatedEffort ? (
                <span className="text-red-600">
                  +{(project.actualEffort - project.estimatedEffort).toFixed(2)} MM over
                </span>
              ) : (
                <span className="text-green-600">
                  {(project.estimatedEffort - project.actualEffort).toFixed(2)} MM remaining
                </span>
              )}
            </p>
          </Card>
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card title="Project Information">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.startDate), 'MMM dd, yyyy')}
                </dd>
              </div>
              {project.endDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">End Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(project.endDate), 'MMM dd, yyyy')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(project.updatedAt), 'MMM dd, yyyy')}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Phases Overview">
            {phases && phases.length > 0 ? (
              <div className="space-y-4">
                {phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/phases/${phase.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{phase.name}</h4>
                      <div className="mt-2 flex items-center gap-4">
                        <StatusBadge status={phase.status as any} />
                        <span className="text-sm text-gray-500">
                          {phase.actualEffort}/{phase.estimatedEffort} MM
                        </span>
                      </div>
                    </div>
                    <div className="w-48">
                      <ProgressBar progress={phase.progress} showLabel />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No phases yet"
                description="Add phases to start tracking progress"
                action={
                  <Button onClick={() => setShowAddPhase(true)}>
                    Add First Phase
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === 'phases' && (
        <Card
          title="Phases"
          actions={
            <Button onClick={() => setShowAddPhase(true)}>
              Add Phase
            </Button>
          }
        >
          {phases && phases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Progress
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Effort
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Start Date
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {phases.map((phase) => (
                    <tr key={phase.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {phase.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <StatusBadge status={phase.status as any} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="w-32">
                          <ProgressBar progress={phase.progress} showLabel />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {phase.actualEffort}/{phase.estimatedEffort} MM
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(phase.startDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingPhase(phase)}
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
              title="No phases yet"
              description="Add phases to start tracking progress"
              action={
                <Button onClick={() => setShowAddPhase(true)}>
                  Add First Phase
                </Button>
              }
            />
          )}
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card title="Project Settings">
          <p className="text-gray-500">Settings will be displayed here</p>
        </Card>
      )}

      {/* Modals */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title="Edit Project"
      >
        <ProjectForm
          project={project}
          onSuccess={() => setShowEditProject(false)}
          onCancel={() => setShowEditProject(false)}
        />
      </Modal>

      <Modal
        isOpen={showAddPhase || !!editingPhase}
        onClose={() => {
          setShowAddPhase(false);
          setEditingPhase(null);
        }}
        title={editingPhase ? "Edit Phase" : "Add Phase"}
      >
        <PhaseForm
          projectId={parseInt(projectId)}
          phase={editingPhase}
          onSuccess={() => {
            setShowAddPhase(false);
            setEditingPhase(null);
          }}
          onCancel={() => {
            setShowAddPhase(false);
            setEditingPhase(null);
          }}
        />
      </Modal>
    </div>
  );
}
