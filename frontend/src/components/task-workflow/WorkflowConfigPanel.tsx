import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show initialize button if no stages exist
  if (!config?.stages || config.stages.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('taskWorkflow.noWorkflowConfig')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('taskWorkflow.initializeConfigDescription')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending
              ? t('common.loading')
              : t('taskWorkflow.initializeDefault')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{t('taskWorkflow.workflowConfiguration')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('taskWorkflow.configDescription')}</Typography>
        </Box>
        <Button variant="contained" onClick={() => setShowAddStage(true)}>
          {t('taskWorkflow.addStage')}
        </Button>
      </Box>

      {/* Stages List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {config.stages.map((stage, stageIndex) => (
          <Card key={stage.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body1" fontWeight={500} color="text.secondary">
                    {stageIndex + 1}. {stage.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({stage.steps?.length || 0} {t('taskWorkflow.steps')})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setEditingStage(stage)}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => {
                      if (confirm(t('taskWorkflow.confirmDeleteStage'))) {
                        deleteStageMutation.mutate(stage.id);
                      }
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </Box>
              </Box>

              {/* Steps */}
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  {stage.steps?.map((step, stepIndex) => (
                    <Chip
                      key={step.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{stepIndex + 1}.</Typography>
                          <span>{step.name}</span>
                        </Box>
                      }
                      onDelete={() => {
                        if (confirm(t('taskWorkflow.confirmDeleteStep'))) {
                          deleteStepMutation.mutate(step.id);
                        }
                      }}
                      deleteIcon={<CloseIcon fontSize="small" />}
                      sx={{
                        '& .MuiChip-label': { display: 'flex', alignItems: 'center' },
                        '&:hover .edit-icon': { opacity: 1 },
                      }}
                      icon={
                        <IconButton
                          size="small"
                          className="edit-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStep({ step, stageId: stage.id });
                          }}
                          sx={{ opacity: 0, transition: 'opacity 0.2s', p: 0, ml: 0.5 }}
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      }
                    />
                  ))}
                </Box>

                {/* Add Step */}
                {addingStepToStage === stage.id ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      value={newStepName}
                      onChange={(e) => setNewStepName(e.target.value)}
                      placeholder={t('taskWorkflow.stepName')}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
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
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setAddingStepToStage(null);
                        setNewStepName('');
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setAddingStepToStage(stage.id)}
                    sx={{ color: 'primary.main' }}
                  >
                    + {t('taskWorkflow.addStep')}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Add Stage Modal */}
      <Dialog
        open={showAddStage}
        onClose={() => {
          setShowAddStage(false);
          setNewStageName('');
        }}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{t('taskWorkflow.addStage')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('taskWorkflow.stageName')}
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder={t('taskWorkflow.stageNamePlaceholder')}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowAddStage(false);
                  setNewStageName('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (newStageName.trim()) {
                    createStageMutation.mutate(newStageName.trim());
                  }
                }}
                disabled={createStageMutation.isPending || !newStageName.trim()}
              >
                {t('common.create')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Modal */}
      <Dialog
        open={!!editingStage}
        onClose={() => setEditingStage(null)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{t('taskWorkflow.editStage')}</DialogTitle>
        <DialogContent>
          {editingStage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label={t('taskWorkflow.stageName')}
                value={editingStage.name}
                onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                size="small"
                fullWidth
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => setEditingStage(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (editingStage.name.trim()) {
                      updateStageMutation.mutate({ id: editingStage.id, name: editingStage.name.trim() });
                    }
                  }}
                  disabled={updateStageMutation.isPending}
                >
                  {t('common.save')}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Step Modal */}
      <Dialog
        open={!!editingStep}
        onClose={() => setEditingStep(null)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{t('taskWorkflow.editStep')}</DialogTitle>
        <DialogContent>
          {editingStep && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label={t('taskWorkflow.stepName')}
                value={editingStep.step.name}
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    step: { ...editingStep.step, name: e.target.value },
                  })
                }
                size="small"
                fullWidth
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => setEditingStep(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (editingStep.step.name.trim()) {
                      updateStepMutation.mutate({ id: editingStep.step.id, name: editingStep.step.name.trim() });
                    }
                  }}
                  disabled={updateStepMutation.isPending}
                >
                  {t('common.save')}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
