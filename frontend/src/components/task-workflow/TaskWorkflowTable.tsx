import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import type { Member, StepScreenFunctionStatus } from '@/types';

interface TaskWorkflowTableProps {
  projectId: number;
  members?: Member[];
}

// Type for step screen function from API
interface StepScreenFunctionItem {
  id: number;
  stepId: number;
  screenFunctionId: number;
  status: StepScreenFunctionStatus;
}

export function TaskWorkflowTable({ projectId }: TaskWorkflowTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filter state
  const [screenFilter, setScreenFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  // Fetch workflow data
  const { data: workflowData, isLoading, refetch } = useQuery({
    queryKey: ['taskWorkflow', projectId, screenFilter, stageFilter, statusFilter],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectWorkflow(projectId, {
        screenName: screenFilter || undefined,
        stageId: stageFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      return response.data;
    },
  });

  // Initialize workflow mutation
  const initializeMutation = useMutation({
    mutationFn: () => taskWorkflowApi.initializeWorkflow(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
    },
  });

  // Export to Excel
  const handleExport = async () => {
    try {
      const response = await taskWorkflowApi.exportExcel(projectId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `task-workflow-${projectId}-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get StepScreenFunction status for a screen function and step
  // Returns: 'Completed' | 'In Progress' | 'Not Started' | 'Skipped' | null (not linked)
  const getStepScreenFunctionStatus = (
    screenFunctionId: number,
    stepId: number
  ): StepScreenFunctionStatus | null => {
    if (!workflowData?.stepScreenFunctions) return null;
    const ssf = workflowData.stepScreenFunctions.find(
      (s: StepScreenFunctionItem) =>
        s.screenFunctionId === screenFunctionId && s.stepId === stepId
    );
    return ssf ? ssf.status : null;
  };

  // Calculate release percentage for a screen function based on StepScreenFunction status
  const calculateReleasePercentage = (screenFunctionId: number): number => {
    if (!workflowData?.stepScreenFunctions) return 0;

    // Get steps that have a StepScreenFunction link for this screenFunction
    const linkedSteps = workflowData.stepScreenFunctions.filter(
      (s: StepScreenFunctionItem) => s.screenFunctionId === screenFunctionId
    );
    if (linkedSteps.length === 0) return 0;

    const completedCount = linkedSteps.filter(
      (s: StepScreenFunctionItem) => s.status === 'Completed'
    ).length;

    return Math.round((completedCount / linkedSteps.length) * 100);
  };

  // All steps flattened
  const allSteps = useMemo(() => {
    if (!workflowData?.stages) return [];
    return workflowData.stages.flatMap((stage) =>
      (stage.steps || []).map((step) => ({
        ...step,
        stageName: stage.name,
        stageColor: stage.color,
      }))
    );
  }, [workflowData?.stages]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  // Show initialize button if no stages exist
  if (!workflowData?.stages || workflowData.stages.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('taskWorkflow.noWorkflow')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('taskWorkflow.initializeDescription')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              {initializeMutation.isPending
                ? t('common.loading')
                : t('taskWorkflow.initialize')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Progress Overview */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>{t('taskWorkflow.progress')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {workflowData.progress.completed} / {workflowData.progress.total} {t('taskWorkflow.stepsCompleted')}
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary">
              {workflowData.progress.percentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={workflowData.progress.percentage}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              {/* Screen Filter */}
              <TextField
                size="small"
                placeholder={t('taskWorkflow.filterByScreen')}
                value={screenFilter}
                onChange={(e) => setScreenFilter(e.target.value)}
                sx={{ width: 256 }}
              />

              {/* Stage Filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('taskWorkflow.stage')}</InputLabel>
                <Select
                  value={stageFilter || ''}
                  onChange={(e) => setStageFilter(e.target.value ? Number(e.target.value) : null)}
                  label={t('taskWorkflow.stage')}
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="">{t('taskWorkflow.allStages')}</MenuItem>
                  {workflowData.stages.map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('taskWorkflow.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'incomplete')}
                  label={t('taskWorkflow.status')}
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="all">{t('taskWorkflow.allStatus')}</MenuItem>
                  <MenuItem value="completed">{t('taskWorkflow.completed')}</MenuItem>
                  <MenuItem value="incomplete">{t('taskWorkflow.incomplete')}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => refetch()}>
                {t('common.refresh')}
              </Button>
              <Button variant="contained" onClick={handleExport}>
                {t('taskWorkflow.exportExcel')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Workflow Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 'max-content' }}>
          <TableHead>
            {/* Stage Header Row */}
            <TableRow>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  bgcolor: 'grey.100',
                  width: 48,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                No
              </TableCell>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 48,
                  zIndex: 3,
                  bgcolor: 'grey.100',
                  minWidth: 200,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                Screen
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: 'grey.100',
                  minWidth: 150,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                Note
              </TableCell>
              {workflowData.stages.map((stage) => (
                <TableCell
                  key={stage.id}
                  colSpan={(stage.steps || []).length}
                  align="center"
                  sx={{
                    bgcolor: stage.color || 'grey.200',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.primary',
                  }}
                >
                  {stage.name}
                  <Typography component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>
                    ({(stage.steps || []).length})
                  </Typography>
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  bgcolor: 'grey.100',
                  width: 80,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                Release
              </TableCell>
            </TableRow>

            {/* Step Header Row */}
            <TableRow>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  bgcolor: 'grey.50',
                }}
              />
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 48,
                  zIndex: 3,
                  bgcolor: 'grey.50',
                }}
              />
              <TableCell sx={{ bgcolor: 'grey.50' }} />
              {allSteps.map((step) => (
                <TableCell
                  key={step.id}
                  align="center"
                  title={`${step.stageName} - ${step.name}`}
                  sx={{
                    bgcolor: 'grey.50',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    px: 0.5,
                  }}
                >
                  {step.name}
                </TableCell>
              ))}
              <TableCell sx={{ bgcolor: 'grey.50' }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {workflowData.screenFunctions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + allSteps.length}
                  align="center"
                  sx={{ py: 6, color: 'text.secondary' }}
                >
                  {t('taskWorkflow.noScreenFunctions')}
                </TableCell>
              </TableRow>
            ) : (
              workflowData.screenFunctions.map((sf, index) => {
                const releasePercentage = calculateReleasePercentage(sf.id);
                return (
                  <TableRow key={sf.id} hover>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                      }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 48,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {sf.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sf.type}
                      </Typography>
                    </TableCell>
                    <TableCell
                      title={sf.description}
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sf.description || '-'}
                    </TableCell>
                    {allSteps.map((step) => {
                      const status = getStepScreenFunctionStatus(sf.id, step.id);
                      return (
                        <TableCell
                          key={`${sf.id}-${step.id}`}
                          align="center"
                          title={status ? t(`screenFunction.status${status.replace(' ', '')}`) : t('taskWorkflow.notLinked')}
                          sx={{ px: 0.5 }}
                        >
                          {status === null ? (
                            <Typography color="text.disabled">-</Typography>
                          ) : status === 'Completed' ? (
                            <Typography color="success.main">✓</Typography>
                          ) : status === 'Skipped' ? (
                            <Typography color="text.disabled">○</Typography>
                          ) : (
                            <Typography color="text.disabled">☐</Typography>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      <Chip
                        label={`${releasePercentage}%`}
                        size="small"
                        color={
                          releasePercentage === 100
                            ? 'success'
                            : releasePercentage >= 50
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
