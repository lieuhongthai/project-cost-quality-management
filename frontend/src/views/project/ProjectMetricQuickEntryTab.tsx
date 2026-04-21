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
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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

interface ExistingMetricRow {
  stageId: number;
  stageName: string;
  stepName: string;
  screenFunctionName: string;
  metricTypeName: string;
  categoryName: string;
  value: number;
}

interface InsightCard {
  key: string;
  label: string;
  value: string;
  formula: string;
  meaning: string;
}

interface TestCaseStageStat {
  stageId: number;
  stageName: string;
  totalTestCases: number;
  ngCount: number;
  ngRate: number;
  avgMinutesPerCase: number;
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
  const [listStageFilter, setListStageFilter] = useState<number | ''>('');

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

  const { data: metricSummary } = useQuery({
    queryKey: ['projectMetricTypeSummary', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectMetricTypeSummary(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  const { data: projectMetricInsights } = useQuery({
    queryKey: ['projectMetricInsights', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectMetricInsights(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  const selectedMetricType = useMemo(
    () => metricTypes.find((mt) => mt.id === Number(selectedMetricTypeId)),
    [metricTypes, selectedMetricTypeId],
  );

  const categories = selectedMetricType?.categories || [];

  const existingMetricRows = useMemo((): ExistingMetricRow[] => {
    if (!metricSummary) return [];

    const categoryMap = new Map<number, { categoryName: string; metricTypeName: string }>();
    for (const metricType of metricSummary.metricTypes) {
      for (const category of metricType.categories) {
        categoryMap.set(category.id, {
          categoryName: category.name,
          metricTypeName: metricType.name,
        });
      }
    }

    const flattened: ExistingMetricRow[] = [];

    for (const stage of metricSummary.stages) {
      if (listStageFilter && stage.stageId !== Number(listStageFilter)) continue;

      for (const step of stage.steps) {
        for (const screenFunction of step.screenFunctions) {
          for (const metric of screenFunction.metrics) {
            if ((metric.value || 0) <= 0) continue;
            const info = categoryMap.get(metric.metricCategoryId);
            if (!info) continue;

            flattened.push({
              stageId: stage.stageId,
              stageName: stage.stageName,
              stepName: step.stepName,
              screenFunctionName: screenFunction.screenFunctionName,
              metricTypeName: info.metricTypeName,
              categoryName: info.categoryName,
              value: metric.value,
            });
          }
        }
      }
    }

    return flattened.sort((a, b) => {
      if (a.stageId !== b.stageId) return a.stageId - b.stageId;
      return a.screenFunctionName.localeCompare(b.screenFunctionName);
    });
  }, [listStageFilter, metricSummary]);

  const insightCards = useMemo((): InsightCard[] => {
    if (!metricSummary) return [];

    const categoryMap = new Map<number, { categoryName: string; metricTypeName: string }>();
    for (const metricType of metricSummary.metricTypes) {
      for (const category of metricType.categories) {
        categoryMap.set(category.id, {
          categoryName: category.name.trim().toLowerCase(),
          metricTypeName: metricType.name.trim().toLowerCase(),
        });
      }
    }

    let totalScreens = 0;
    let totalReviewIssues = 0;
    let shiftLeftIssues = 0;
    const stageRisk = new Map<number, { stageName: string; score: number }>();

    for (const stage of metricSummary.stages) {
      let stageScore = 0;

      for (const step of stage.steps) {
        totalScreens += step.screenFunctions.length;

        for (const screenFunction of step.screenFunctions) {
          for (const metric of screenFunction.metrics) {
            const info = categoryMap.get(metric.metricCategoryId);
            if (!info || (metric.value || 0) <= 0) continue;

            const typeName = info.metricTypeName;
            const categoryName = info.categoryName;
            const value = metric.value || 0;

            if (typeName !== 'test cases') {
              totalReviewIssues += value;
              if (typeName.includes('requirement') || typeName.includes('functional design')) {
                shiftLeftIssues += value;
              }
            }

            if (typeName.includes('requirement')) stageScore += value * 1.2;
            else if (typeName.includes('functional design')) stageScore += value * 1.1;
            else if (typeName.includes('coding')) stageScore += value * 1.0;
            else if (typeName.includes('test cases') && categoryName === 'failed') stageScore += value * 1.5;
            else stageScore += value * 0.9;
          }
        }
      }

      stageRisk.set(stage.stageId, {
        stageName: stage.stageName,
        score: stageScore,
      });
    }

    const issueDensityPerScreen = totalScreens > 0 ? totalReviewIssues / totalScreens : 0;
    const shiftLeftScore = totalReviewIssues > 0 ? (shiftLeftIssues / totalReviewIssues) * 100 : 0;
    const topRiskStage = Array.from(stageRisk.values()).sort((a, b) => b.score - a.score)[0];

    return [
      {
        key: 'total-review-issues',
        label: t('metrics.insightTotalReviewIssues', 'Total Review Issues'),
        value: totalReviewIssues.toLocaleString(),
        formula: 'Σ(issue categories except Test Cases)',
        meaning: t(
          'metrics.insightTotalReviewIssuesMeaning',
          'Total amount of review findings across requirement/design/coding/review metrics.',
        ),
      },
      {
        key: 'issue-density',
        label: t('metrics.insightIssueDensity', 'Issue Density / Screen'),
        value: issueDensityPerScreen.toFixed(2),
        formula: 'Total Review Issues / Total Screen Functions',
        meaning: t(
          'metrics.insightIssueDensityMeaning',
          'Higher value means quality problems are concentrated per screen and should be prioritized.',
        ),
      },
      {
        key: 'shift-left-score',
        label: t('metrics.insightShiftLeftScore', 'Shift-left Score'),
        value: `${shiftLeftScore.toFixed(1)}%`,
        formula: '(Requirement + Functional Design issues) / Total Review Issues * 100',
        meaning: t(
          'metrics.insightShiftLeftMeaning',
          'Higher score means more defects are caught earlier before coding/testing.',
        ),
      },
      {
        key: 'stage-risk-score',
        label: t('metrics.insightStageRiskScore', 'Top Stage Risk Score'),
        value: topRiskStage ? `${topRiskStage.stageName}: ${topRiskStage.score.toFixed(1)}` : '-',
        formula: 'Requirement*1.2 + FunctionalDesign*1.1 + Coding*1.0 + FailedTest*1.5 (+ others*0.9)',
        meaning: t(
          'metrics.insightStageRiskMeaning',
          'Weighted score to quickly identify the stage that is most likely to impact delivery quality/time.',
        ),
      },
    ];
  }, [metricSummary, t]);

  const testCaseStats = useMemo(() => {
    if (!projectMetricInsights) {
      return {
        totalCases: 0,
        ngCount: 0,
        ngRate: 0,
        avgMinutesPerCase: 0,
        byStage: [] as TestCaseStageStat[],
      };
    }

    const projectTotal = projectMetricInsights.project?.totalTestCases || 0;
    const projectNgCount = projectMetricInsights.project?.bugCount || 0;
    const projectActualMinutes = projectMetricInsights.project?.actualMinutes || 0;

    const byStage = (projectMetricInsights.stages || []).map((stage) => {
      const total = stage.totalTestCases || 0;
      const ng = stage.bugCount || 0;
      const minutes = stage.actualMinutes || 0;
      return {
        stageId: stage.stageId,
        stageName: stages.find((s) => s.id === stage.stageId)?.name || `#${stage.stageId}`,
        totalTestCases: total,
        ngCount: ng,
        ngRate: total > 0 ? (ng / total) * 100 : 0,
        avgMinutesPerCase: total > 0 ? minutes / total : 0,
      };
    });

    return {
      totalCases: projectTotal,
      ngCount: projectNgCount,
      ngRate: projectTotal > 0 ? (projectNgCount / projectTotal) * 100 : 0,
      avgMinutesPerCase: projectTotal > 0 ? projectActualMinutes / projectTotal : 0,
      byStage: byStage.sort((a, b) => a.stageId - b.stageId),
    };
  }, [projectMetricInsights, stages]);

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

      <Card title={t('metrics.insightTitle', 'Meaningful Insights')}>
        {insightCards.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography color="text.secondary">
              {t('metrics.noMetricsLogged', 'No metrics logged yet')}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {insightCards.map((item) => (
              <Grid key={item.key} size={{ xs: 12, md: 6, lg: 3 }}>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            {t('metrics.formula', 'Formula')}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                            {item.formula}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            {t('metrics.meaning', 'Meaning')}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            {item.meaning}
                          </Typography>
                        </Box>
                      }
                      arrow
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="h6" fontWeight={700}>{item.value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Card>

      <Card title={t('metrics.testCaseInsightTitle', 'Test Case Efficiency Statistics')}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t('metrics.totalTestCases', 'Total Test Cases')}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {testCaseStats.totalCases.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('metrics.avgMinutesPerCase', 'Avg minutes / case')}
                </Typography>
                <Tooltip
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {t('metrics.formula', 'Formula')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                        Actual Minutes / Total Test Cases
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {t('metrics.meaning', 'Meaning')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {t(
                          'metrics.avgMinutesPerCaseMeaning',
                          'Shows average execution time per test case. Higher value may indicate complex tests or bottlenecks.',
                        )}
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {testCaseStats.avgMinutesPerCase.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('metrics.ngRate', 'NG Rate')}
                </Typography>
                <Tooltip
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {t('metrics.formula', 'Formula')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                        NG Count / Total Test Cases * 100
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {t('metrics.meaning', 'Meaning')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {t(
                          'metrics.ngRateMeaning',
                          'Indicates failure ratio of test execution. Higher rate suggests quality or stability risk.',
                        )}
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {testCaseStats.ngRate.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('metrics.ngCount', 'NG Count')}: {testCaseStats.ngCount.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ maxHeight: 360, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t('stages.title', 'Stage')}</TableCell>
                <TableCell align="right">{t('metrics.totalTestCases', 'Total Test Cases')}</TableCell>
                <TableCell align="right">{t('metrics.ngCount', 'NG Count')}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {t('metrics.ngRate', 'NG Rate')}
                    <Tooltip title={'NG Count / Total Test Cases * 100'} arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {t('metrics.avgMinutesPerCase', 'Avg minutes / case')}
                    <Tooltip title={'Actual Minutes / Total Test Cases'} arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {testCaseStats.byStage.map((stage) => (
                <TableRow key={stage.stageId} hover>
                  <TableCell>{stage.stageName}</TableCell>
                  <TableCell align="right">{stage.totalTestCases.toLocaleString()}</TableCell>
                  <TableCell align="right">{stage.ngCount.toLocaleString()}</TableCell>
                  <TableCell align="right">{stage.ngRate.toFixed(2)}%</TableCell>
                  <TableCell align="right">{stage.avgMinutesPerCase.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {testCaseStats.byStage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {t('metrics.noMetricsLogged', 'No metrics logged yet')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Card>

      <Card title={t('metrics.metricListTitle', 'Added Metric List')}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('metrics.metricListDescription', 'View metric values that have already been logged.')}
          </Typography>

          <Box sx={{ maxWidth: 280 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('metrics.allStages', 'All stages')}</InputLabel>
              <Select
                value={listStageFilter}
                label={t('metrics.allStages', 'All stages')}
                onChange={(e) => setListStageFilter(e.target.value ? Number(e.target.value) : '')}
              >
                <MenuItem value="">{t('metrics.allStages', 'All stages')}</MenuItem>
                {stages.map((stage: WorkflowStage) => (
                  <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="caption" color="text.secondary">
            {t('common.total', 'Total')}: {existingMetricRows.length}
          </Typography>

          {existingMetricRows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography color="text.secondary">
                {t('metrics.noMetricsLogged', 'No metrics logged yet')}
              </Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 460, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('stages.title', 'Stage')}</TableCell>
                    <TableCell>{t('stages.step', 'Step')}</TableCell>
                    <TableCell>{t('nav.screenFunctions', 'Screen/Function')}</TableCell>
                    <TableCell>{t('metrics.metricTypes', 'Metric Type')}</TableCell>
                    <TableCell>{t('metrics.categories', 'Category')}</TableCell>
                    <TableCell align="right">{t('metrics.value', 'Value')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {existingMetricRows.map((item, index) => (
                    <TableRow key={`${item.stageId}-${item.stepName}-${item.screenFunctionName}-${item.categoryName}-${index}`} hover>
                      <TableCell>{item.stageName}</TableCell>
                      <TableCell>{item.stepName}</TableCell>
                      <TableCell>{item.screenFunctionName}</TableCell>
                      <TableCell>{item.metricTypeName}</TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell align="right">{item.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
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
