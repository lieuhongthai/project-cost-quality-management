import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, screenFunctionApi } from '@/services/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import { StageEditModal } from './StageEditModal';
import type { StageOverviewData, StageStatus, EffortUnit, ProjectSettings, ScreenFunctionType } from '@/types';
import { convertEffort, formatEffort, EFFORT_UNIT_LABELS } from '@/utils/effortUtils';

interface StagesOverviewPanelProps {
  projectId: number;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
}

export function StagesOverviewPanel({
  projectId,
  effortUnit = 'man-hour',
  workSettings,
}: StagesOverviewPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState<StageOverviewData | null>(null);
  const [quickLinkStageId, setQuickLinkStageId] = useState<number | null>(null);
  const [quickLinkType, setQuickLinkType] = useState<ScreenFunctionType>('Screen');
  const [quickLinkAssignMembers, setQuickLinkAssignMembers] = useState(false);
  const [quickLinkResult, setQuickLinkResult] = useState<{
    created: number;
    skipped: number;
    membersAssigned: number;
    details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }>;
  } | null>(null);

  // Fetch stages overview
  const { data: stages, isLoading, refetch } = useQuery({
    queryKey: ['stagesOverview', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(projectId);
      return response.data;
    },
  });

  // Fetch screen function summary for quick link counts
  const { data: sfSummary } = useQuery({
    queryKey: ['screenFunctionSummary', projectId],
    queryFn: async () => {
      const response = await screenFunctionApi.getSummary(projectId);
      return response.data;
    },
    enabled: quickLinkStageId !== null,
  });

  // Fetch default members to show count
  const { data: defaultMembers } = useQuery({
    queryKey: ['sfDefaultMembers', projectId],
    queryFn: async () => {
      const response = await screenFunctionApi.getDefaultMembersByProject(projectId);
      return response.data;
    },
    enabled: quickLinkStageId !== null,
  });

  // Quick link mutation
  const quickLinkMutation = useMutation({
    mutationFn: (data: { stageId: number; type: string; assignMembers: boolean }) =>
      taskWorkflowApi.quickLinkByType(data.stageId, data.type, data.assignMembers),
    onSuccess: (response) => {
      setQuickLinkResult(response.data);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary'] });
    },
  });

  const handleQuickLink = () => {
    if (!quickLinkStageId) return;
    quickLinkMutation.mutate({
      stageId: quickLinkStageId,
      type: quickLinkType,
      assignMembers: quickLinkAssignMembers,
    });
  };

  const openQuickLink = (stageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickLinkStageId(stageId);
    setQuickLinkType('Screen');
    setQuickLinkAssignMembers(false);
    setQuickLinkResult(null);
  };

  const closeQuickLink = () => {
    setQuickLinkStageId(null);
    setQuickLinkResult(null);
  };

  // Handle stage click to navigate to stage detail
  const handleStageClick = (stageId: number) => {
    window.location.href = `/projects/${projectId}/stages/${stageId}`;
  };

  // Handle edit modal close
  const handleEditClose = (saved?: boolean) => {
    setEditingStage(null);
    if (saved) {
      refetch();
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Format effort with unit conversion
  const displayEffort = (hours: number): string => {
    const converted = convertEffort(hours, 'man-hour', effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
  };

  // Get status color for MUI Chip
  const getStatusColor = (status: StageStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'Good':
        return 'success';
      case 'Warning':
        return 'warning';
      case 'At Risk':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get unit label
  const unitLabel = EFFORT_UNIT_LABELS[effortUnit];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!stages || stages.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('stages.noStages')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('stages.initializeWorkflowFirst')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>{t('stages.title')}</Typography>
        <Button variant="outlined" onClick={() => refetch()}>
          {t('common.refresh')}
        </Button>
      </Box>

      {/* Stages Grid */}
      <Grid container spacing={2}>
        {stages.map((stage) => (
          <Grid key={stage.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
              <CardContent>
                {/* Stage Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box
                    sx={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => handleStageClick(stage.id)}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={500}
                      sx={{ '&:hover': { color: 'primary.main' } }}
                    >
                      {stage.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={stage.status}
                        size="small"
                        color={getStatusColor(stage.status)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {stage.stepsCount} {t('stages.steps')} | {stage.linkedScreensCount} {t('stages.linkedScreens')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => openQuickLink(stage.id, e)}
                      title={t('stages.quickLink', { defaultValue: 'Quick Link' })}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStage(stage);
                      }}
                    >
                      {t('common.edit')}
                    </Button>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">{t('stages.progress')}</Typography>
                    <Typography variant="body2" fontWeight={500}>{stage.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={stage.progress} sx={{ height: 6, borderRadius: 1 }} />
                </Box>

                {/* Dates */}
                <Grid container spacing={1} sx={{ mb: 1.5 }}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">{t('stages.startDate')}:</Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>{formatDate(stage.startDate)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">{t('stages.endDate')}:</Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>{formatDate(stage.endDate)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">{t('stages.actualStart')}:</Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>{formatDate(stage.actualStartDate)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">{t('stages.actualEnd')}:</Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>{formatDate(stage.actualEndDate)}</Typography>
                  </Grid>
                </Grid>

                {/* Effort */}
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                  <Grid container spacing={1}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">{t('stages.estimatedEffort')}:</Typography>
                      <Typography variant="body2" fontWeight={500} component="span" sx={{ ml: 0.5 }}>
                        {displayEffort(stage.estimatedEffort || 0)} {unitLabel}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">{t('stages.actualEffort')}:</Typography>
                      <Typography variant="body2" fontWeight={500} component="span" sx={{ ml: 0.5 }}>
                        {displayEffort(stage.actualEffort || 0)} {unitLabel}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* View Details Link */}
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => handleStageClick(stage.id)}
                    sx={{ p: 0, minWidth: 'auto' }}
                  >
                    {t('stages.viewDetails')} &rarr;
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Modal */}
      {editingStage && (
        <StageEditModal
          stage={editingStage}
          projectId={projectId}
          effortUnit={effortUnit}
          workSettings={workSettings}
          onClose={handleEditClose}
        />
      )}

      {/* Quick Link Modal */}
      <Dialog
        open={quickLinkStageId !== null}
        onClose={closeQuickLink}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{t('stages.quickLinkTitle', { defaultValue: 'Quick Link Screen/Functions' })}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!quickLinkResult ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('stages.quickLinkDescription', {
                    defaultValue: 'Automatically link all Screen/Functions of a selected type to every step of this stage. Existing links will be skipped.',
                  })}
                </Typography>

                {/* Stage name context */}
                {quickLinkStageId && (
                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, px: 1.5, py: 1 }}>
                    <Typography variant="caption" color="text.secondary">{t('stages.stage', { defaultValue: 'Stage' })}:</Typography>
                    <Typography variant="body2" fontWeight={500} component="span" sx={{ ml: 1 }}>
                      {stages?.find(s => s.id === quickLinkStageId)?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({stages?.find(s => s.id === quickLinkStageId)?.stepsCount} {t('stages.steps')})
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                    {t('stages.quickLinkSelectType', { defaultValue: 'Select type to link' })}
                  </Typography>
                  <Grid container spacing={1.5}>
                    {(['Screen', 'Function', 'Other'] as ScreenFunctionType[]).map((type) => {
                      const count = sfSummary?.byType?.[type] ?? 0;
                      const isSelected = quickLinkType === type;
                      const colorMap: Record<string, string> = {
                        Screen: isSelected ? 'secondary.light' : 'background.paper',
                        Function: isSelected ? 'primary.light' : 'background.paper',
                        Other: isSelected ? 'warning.light' : 'background.paper',
                      };
                      const chipColorMap: Record<string, 'secondary' | 'primary' | 'warning'> = {
                        Screen: 'secondary',
                        Function: 'primary',
                        Other: 'warning',
                      };

                      return (
                        <Grid key={type} size={4}>
                          <Box
                            onClick={() => setQuickLinkType(type)}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              border: 2,
                              borderColor: isSelected ? `${chipColorMap[type]}.main` : 'divider',
                              bgcolor: colorMap[type],
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: `${chipColorMap[type]}.main` },
                            }}
                          >
                            <Chip label={type} size="small" color={chipColorMap[type]} sx={{ mb: 0.5 }} />
                            <Typography variant="h6" fontWeight={600}>{count}</Typography>
                            <Typography variant="caption" color="text.secondary">{t('stages.items', { defaultValue: 'items' })}</Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>

                {quickLinkStageId && (
                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('stages.quickLinkPreview', { defaultValue: 'Preview' })}
                    </Typography>
                    <Typography variant="body2">
                      {sfSummary?.byType?.[quickLinkType] ?? 0} {quickLinkType}(s) &times; {stages?.find(s => s.id === quickLinkStageId)?.stepsCount ?? 0} step(s) = {t('stages.upTo', { defaultValue: 'up to' })} <strong>{(sfSummary?.byType?.[quickLinkType] ?? 0) * (stages?.find(s => s.id === quickLinkStageId)?.stepsCount ?? 0)}</strong> {t('stages.tasks', { defaultValue: 'tasks' })}
                    </Typography>
                  </Box>
                )}

                {/* Assign Members Option */}
                {(() => {
                  const sfIdsWithMembers = new Set(defaultMembers?.map(item => item.screenFunctionId) || []);
                  const hasAnyDefaultMembers = sfIdsWithMembers.size > 0;

                  return (
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={quickLinkAssignMembers}
                            onChange={(e) => setQuickLinkAssignMembers(e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {t('stages.quickLinkAssignMembers', { defaultValue: 'Auto-assign default members' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {hasAnyDefaultMembers
                                ? t('stages.quickLinkAssignMembersDesc', {
                                    defaultValue: 'Automatically assign default members configured in Screen/Functions tab to newly created tasks.',
                                  })
                                : t('stages.quickLinkNoDefaultMembers', {
                                    defaultValue: 'No default members configured. Go to Screen/Functions tab to assign default members first.',
                                  })
                              }
                            </Typography>
                            {hasAnyDefaultMembers && (
                              <Typography variant="caption" color="primary">
                                {sfIdsWithMembers.size} {t('stages.sfWithAssignees', { defaultValue: 'Screen/Function(s) with default assignees' })}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>
                  );
                })()}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
                  <Button variant="outlined" onClick={closeQuickLink}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleQuickLink}
                    disabled={quickLinkMutation.isPending || (sfSummary?.byType?.[quickLinkType] ?? 0) === 0}
                  >
                    {quickLinkMutation.isPending ? <CircularProgress size={20} /> : t('stages.quickLinkAction', { defaultValue: `Link ${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s)` })}
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: 'success.light',
                    mb: 1.5,
                  }}>
                    <svg className="w-6 h-6" style={{ color: '#2e7d32' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Box>
                  <Typography variant="h6">
                    {t('stages.quickLinkComplete', { defaultValue: 'Quick Link Complete' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('stages.quickLinkCreated', {
                      defaultValue: `Created ${quickLinkResult.created} new task(s), skipped ${quickLinkResult.skipped} existing`,
                      created: quickLinkResult.created,
                      skipped: quickLinkResult.skipped,
                    })}
                  </Typography>
                  {quickLinkResult.membersAssigned > 0 && (
                    <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                      {t('stages.quickLinkMembersAssigned', {
                        defaultValue: `${quickLinkResult.membersAssigned} member assignment(s) created`,
                        count: quickLinkResult.membersAssigned,
                      })}
                    </Typography>
                  )}
                </Box>

                {quickLinkResult.details.length > 0 && (
                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5 }}>
                    <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('stages.quickLinkDetails', { defaultValue: 'Details by step' })}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                      {quickLinkResult.details.map((d) => (
                        <Box key={d.stepId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{d.stepName}</Typography>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Typography variant="body2" color={d.linked > 0 ? 'success.main' : 'text.disabled'} fontWeight={d.linked > 0 ? 500 : 400}>
                              +{d.linked} {t('stages.tasks', { defaultValue: 'tasks' })}
                            </Typography>
                            {d.membersAssigned > 0 && (
                              <Typography variant="body2" color="primary" fontWeight={500}>
                                +{d.membersAssigned} {t('stages.assignees', { defaultValue: 'assignees' })}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                  <Button variant="contained" onClick={closeQuickLink}>
                    {t('common.close', { defaultValue: 'Close' })}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
