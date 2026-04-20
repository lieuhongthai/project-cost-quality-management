import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import type {
  MetricType,
  WorkflowStage,
  WorkflowStep,
  StepScreenFunction,
  StepScreenFunctionMember,
  TaskMemberMetric,
} from '@/types';
import { Card, LoadingSpinner } from '@/components/common';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';

interface ProjectMetricQuickEntryTabProps {
  projectId: number;
}

interface MetricEntryRow {
  memberTaskId: number;
  stepScreenFunctionId: number;
  screenFunctionName: string;
  memberName: string;
  metricValues: Record<number, number>;
}

export function ProjectMetricQuickEntryTab({ projectId }: ProjectMetricQuickEntryTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMetricTypeId, setSelectedMetricTypeId] = useState<number | ''>('');
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('');
  const [selectedStepId, setSelectedStepId] = useState<number | ''>('');
  const [rows, setRows] = useState<MetricEntryRow[]>([]);
  const [edits, setEdits] = useState<Record<number, Record<number, number>>>({});
  const [loadingRows, setLoadingRows] = useState(false);

  const { data: metricTypes = [], isLoading: loadingMetricTypes } = useQuery({
    queryKey: ['metricTypes', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getMetricTypes(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  const { data: stages = [], isLoading: loadingStages } = useQuery({
    queryKey: ['workflowStages', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStages(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ['workflowStepsByStage', selectedStageId],
    queryFn: async () => {
      if (!selectedStageId) return [];
      const response = await taskWorkflowApi.getSteps(Number(selectedStageId));
      return response.data;
    },
    enabled: !!selectedStageId,
  });

  const selectedMetricType = useMemo(
    () => metricTypes.find((mt) => mt.id === Number(selectedMetricTypeId)),
    [metricTypes, selectedMetricTypeId],
  );

  const categories = selectedMetricType?.categories || [];

  const resetDialogState = () => {
    setSelectedMetricTypeId('');
    setSelectedStageId('');
    setSelectedStepId('');
    setRows([]);
    setEdits({});
  };

  const openQuickDialog = () => {
    resetDialogState();
    setOpenDialog(true);
  };

  const closeQuickDialog = () => {
    setOpenDialog(false);
  };

  const loadRowsForStep = async () => {
    if (!selectedStepId) return;

    try {
      setLoadingRows(true);
      setRows([]);
      setEdits({});

      const ssfResponse = await taskWorkflowApi.getStepScreenFunctions(Number(selectedStepId));
      const stepScreenFunctions = ssfResponse.data as StepScreenFunction[];

      const rowResults: MetricEntryRow[] = [];

      for (const ssf of stepScreenFunctions) {
        const membersResponse = await taskWorkflowApi.getStepScreenFunctionMembers(ssf.id);
        const members = (membersResponse.data || []) as StepScreenFunctionMember[];

        for (const memberTask of members) {
          const metricsResponse = await taskWorkflowApi.getTaskMemberMetrics(memberTask.id);
          const memberMetrics = metricsResponse.data as TaskMemberMetric[];
          const metricValues: Record<number, number> = {};

          memberMetrics.forEach((m) => {
            metricValues[m.metricCategoryId] = m.value || 0;
          });

          rowResults.push({
            memberTaskId: memberTask.id,
            stepScreenFunctionId: ssf.id,
            screenFunctionName: ssf.screenFunction?.name || `#${ssf.screenFunctionId}`,
            memberName: memberTask.member?.name || `#${memberTask.memberId}`,
            metricValues,
          });
        }
      }

      setRows(rowResults);
    } finally {
      setLoadingRows(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = rows
        .map((row) => {
          const rowEdit = edits[row.memberTaskId];
          if (!rowEdit) return null;

          const changedMetrics = categories
            .map((category) => {
              if (!Object.prototype.hasOwnProperty.call(rowEdit, category.id)) return null;

              const nextValue = Number(rowEdit[category.id] ?? 0);
              const currentValue = Number(row.metricValues[category.id] ?? 0);
              if (nextValue === currentValue) return null;

              return {
                metricCategoryId: category.id,
                value: nextValue,
              };
            })
            .filter((item): item is { metricCategoryId: number; value: number } => Boolean(item));

          if (changedMetrics.length === 0) return null;

          return {
            memberTaskId: row.memberTaskId,
            metrics: changedMetrics,
          };
        })
        .filter((item): item is { memberTaskId: number; metrics: Array<{ metricCategoryId: number; value: number }> } => Boolean(item));

      if (updates.length === 0) return;

      await Promise.all(
        updates.map((item) =>
          taskWorkflowApi.bulkUpsertTaskMemberMetrics({
            stepScreenFunctionMemberId: item.memberTaskId,
            metrics: item.metrics,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projectMetricTypeSummary', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['projectMetricInsights', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['stagesOverview', projectId] }),
      ]);

      await loadRowsForStep();
      alert(t('metrics.quickSaveSuccess', 'Metric values have been saved successfully.'));
    },
  });

  const handleEditValue = (memberTaskId: number, categoryId: number, value: number) => {
    setEdits((prev) => ({
      ...prev,
      [memberTaskId]: {
        ...(prev[memberTaskId] || {}),
        [categoryId]: Number.isFinite(value) ? Math.max(0, value) : 0,
      },
    }));
  };

  const getDisplayValue = (row: MetricEntryRow, categoryId: number) => {
    if (
      edits[row.memberTaskId]
      && Object.prototype.hasOwnProperty.call(edits[row.memberTaskId], categoryId)
    ) {
      return edits[row.memberTaskId][categoryId];
    }
    return row.metricValues[categoryId] ?? 0;
  };

  if (loadingMetricTypes || loadingStages) {
    return (
      <Card title={t('metrics.quickEntryTab', 'Metric Entry')}>
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('metrics.quickEntryTab', 'Metric Entry')}>
        <div className="space-y-4">
          <Typography variant="body2" color="text.secondary">
            {t(
              'metrics.quickEntryDescription',
              'Quickly add or edit review/test/bug metrics without navigating into each task detail.',
            )}
          </Typography>

          <Button variant="contained" onClick={openQuickDialog}>
            + {t('metrics.newMetricEntry', 'New Metric')}
          </Button>
        </div>
      </Card>

      <Dialog open={openDialog} onClose={closeQuickDialog} maxWidth="lg" fullWidth disableScrollLock>
        <DialogTitle>{t('metrics.quickEntryDialogTitle', 'Quick Metric Entry')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('metrics.metricTypes')}</InputLabel>
                  <Select
                    value={selectedMetricTypeId}
                    label={t('metrics.metricTypes')}
                    onChange={(e) => {
                      setSelectedMetricTypeId(Number(e.target.value));
                      setRows([]);
                      setEdits({});
                    }}
                  >
                    {metricTypes.map((type: MetricType) => (
                      <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('stages.title')}</InputLabel>
                  <Select
                    value={selectedStageId}
                    label={t('stages.title')}
                    onChange={(e) => {
                      setSelectedStageId(Number(e.target.value));
                      setSelectedStepId('');
                      setRows([]);
                      setEdits({});
                    }}
                  >
                    {stages.map((stage: WorkflowStage) => (
                      <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small" disabled={!selectedStageId}>
                  <InputLabel>{t('stages.step')}</InputLabel>
                  <Select
                    value={selectedStepId}
                    label={t('stages.step')}
                    onChange={(e) => {
                      setSelectedStepId(Number(e.target.value));
                      setRows([]);
                      setEdits({});
                    }}
                  >
                    {steps.map((step: WorkflowStep) => (
                      <MenuItem key={step.id} value={step.id}>{step.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={loadRowsForStep}
                disabled={!selectedMetricTypeId || !selectedStepId || loadingRows}
              >
                {loadingRows ? t('common.loading') : t('metrics.loadTaskSteps', 'Load Task Steps')}
              </Button>
              <Button
                variant="contained"
                onClick={() => saveMutation.mutate()}
                disabled={!selectedMetricTypeId || rows.length === 0 || saveMutation.isPending}
              >
                {saveMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </Box>

            {selectedMetricType && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${t('metrics.metricTypes')}: ${selectedMetricType.name}`} size="small" />
                <Chip
                  label={`${t('metrics.categories')}: ${categories.length}`}
                  size="small"
                  color="primary"
                />
              </Box>
            )}

            {rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography color="text.secondary">
                  {loadingRows
                    ? t('common.loading')
                    : t('metrics.noTaskStepMembers', 'No task-step members found. Please select filters and load data.')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {rows.map((row) => {
                  return (
                    <Box
                      key={row.memberTaskId}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '2fr 2fr' },
                        gap: 1.5,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{row.screenFunctionName}</Typography>
                        <Typography variant="body2" color="text.secondary">{row.memberName}</Typography>
                      </Box>
                      <Grid container spacing={1}>
                        {categories.map((category) => (
                          <Grid key={category.id} size={{ xs: 12, md: 6, lg: 4 }}>
                            <TextField
                              label={`${category.name} (${t('metrics.currentValue', 'Current')}: ${row.metricValues[category.id] ?? 0})`}
                              type="number"
                              size="small"
                              fullWidth
                              value={getDisplayValue(row, category.id)}
                              onChange={(e) => handleEditValue(row.memberTaskId, category.id, Number(e.target.value))}
                              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectMetricQuickEntryTab;
