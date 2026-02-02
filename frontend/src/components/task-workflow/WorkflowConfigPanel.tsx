import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Input, Modal } from '@/components/common';
import type { WorkflowStage, WorkflowStep } from '@/types';

interface WorkflowConfigPanelProps {
  projectId: number;
}

export function WorkflowConfigPanel({ projectId }: WorkflowConfigPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [editingStep, setEditingStep] = useState<{ step: WorkflowStep; stageId: number } | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStepName, setNewStepName] = useState('');
  const [addingStepToStage, setAddingStepToStage] = useState<number | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);

  // Fetch configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['workflowConfig', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getConfiguration(projectId);
      return response.data;
    },
  });

  // Initialize workflow mutation
  const initializeMutation = useMutation({
    mutationFn: () => taskWorkflowApi.initializeWorkflow(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
    },
  });

  // Stage mutations
  const createStageMutation = useMutation({
    mutationFn: (name: string) => taskWorkflowApi.createStage({ projectId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      setNewStageName('');
      setShowAddStage(false);
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      taskWorkflowApi.updateStage(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      setEditingStage(null);
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteStage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
    },
  });

  // Step mutations
  const createStepMutation = useMutation({
    mutationFn: ({ stageId, name }: { stageId: number; name: string }) =>
      taskWorkflowApi.createStep({ stageId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      setNewStepName('');
      setAddingStepToStage(null);
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      taskWorkflowApi.updateStep(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      setEditingStep(null);
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowConfig', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show initialize button if no stages exist
  if (!config?.stages || config.stages.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('taskWorkflow.noWorkflowConfig')}
          </h3>
          <p className="text-gray-500 mb-4">
            {t('taskWorkflow.initializeConfigDescription')}
          </p>
          <Button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending
              ? t('common.loading')
              : t('taskWorkflow.initializeDefault')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('taskWorkflow.workflowConfiguration')}</h3>
          <p className="text-sm text-gray-500">{t('taskWorkflow.configDescription')}</p>
        </div>
        <Button onClick={() => setShowAddStage(true)}>
          {t('taskWorkflow.addStage')}
        </Button>
      </div>

      {/* Stages List */}
      <div className="space-y-4">
        {config.stages.map((stage, stageIndex) => (
          <Card key={stage.id}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium text-gray-700">
                  {stageIndex + 1}. {stage.name}
                </span>
                <span className="text-sm text-gray-500">
                  ({stage.steps?.length || 0} {t('taskWorkflow.steps')})
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingStage(stage)}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(t('taskWorkflow.confirmDeleteStage'))) {
                      deleteStageMutation.mutate(stage.id);
                    }
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex flex-wrap gap-2 mb-3">
                {stage.steps?.map((step, stepIndex) => (
                  <div
                    key={step.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full text-sm group"
                  >
                    <span className="text-gray-500 text-xs">{stepIndex + 1}.</span>
                    <span>{step.name}</span>
                    <button
                      onClick={() => setEditingStep({ step, stageId: stage.id })}
                      className="ml-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('common.edit')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t('taskWorkflow.confirmDeleteStep'))) {
                          deleteStepMutation.mutate(step.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('common.delete')}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Step */}
              {addingStepToStage === stage.id ? (
                <div className="flex gap-2">
                  <Input
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    placeholder={t('taskWorkflow.stepName')}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newStepName.trim()) {
                        createStepMutation.mutate({ stageId: stage.id, name: newStepName.trim() });
                      }
                    }}
                    disabled={createStepMutation.isPending}
                  >
                    {t('common.add')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAddingStepToStage(null);
                      setNewStepName('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingStepToStage(stage.id)}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  + {t('taskWorkflow.addStep')}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Stage Modal */}
      <Modal
        isOpen={showAddStage}
        onClose={() => {
          setShowAddStage(false);
          setNewStageName('');
        }}
        title={t('taskWorkflow.addStage')}
      >
        <div className="space-y-4">
          <Input
            label={t('taskWorkflow.stageName')}
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder={t('taskWorkflow.stageNamePlaceholder')}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddStage(false);
                setNewStageName('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (newStageName.trim()) {
                  createStageMutation.mutate(newStageName.trim());
                }
              }}
              disabled={createStageMutation.isPending || !newStageName.trim()}
            >
              {t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Stage Modal */}
      <Modal
        isOpen={!!editingStage}
        onClose={() => setEditingStage(null)}
        title={t('taskWorkflow.editStage')}
      >
        {editingStage && (
          <div className="space-y-4">
            <Input
              label={t('taskWorkflow.stageName')}
              value={editingStage.name}
              onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingStage(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (editingStage.name.trim()) {
                    updateStageMutation.mutate({ id: editingStage.id, name: editingStage.name.trim() });
                  }
                }}
                disabled={updateStageMutation.isPending}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Step Modal */}
      <Modal
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        title={t('taskWorkflow.editStep')}
      >
        {editingStep && (
          <div className="space-y-4">
            <Input
              label={t('taskWorkflow.stepName')}
              value={editingStep.step.name}
              onChange={(e) =>
                setEditingStep({
                  ...editingStep,
                  step: { ...editingStep.step, name: e.target.value },
                })
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingStep(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (editingStep.step.name.trim()) {
                    updateStepMutation.mutate({ id: editingStep.step.id, name: editingStep.step.name.trim() });
                  }
                }}
                disabled={updateStepMutation.isPending}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
