import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskWorkflowApi, screenFunctionApi } from '@/services/api';
import type { WorklogImportBatchDetail } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@/components/common/DataTable';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from 'react-i18next';

type SortColumn = 'day' | 'stageStep' | 'screenFunction' | 'status';
type SortDirection = 'asc' | 'desc';

interface WorklogImportPanelProps {
  projectId: number;
}

interface ItemOverride {
  stageId?: number;
  stepId?: number;
  screenFunctionId?: number;
}

export function WorklogImportPanel({ projectId }: WorklogImportPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchDetail, setBatchDetail] = useState<WorklogImportBatchDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<number, ItemOverride>>({});
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ItemOverride>({});
  const [clearExistingTasks, setClearExistingTasks] = useState(false);
  const [commitResult, setCommitResult] = useState<null | {
    success: number;
    failed: number;
    skipped: number;
    total: number;
  }>(null);

  const { data: config } = useQuery({
    queryKey: ['workflowConfig', projectId],
    queryFn: async () => (await taskWorkflowApi.getConfiguration(projectId)).data,
  });

  const { data: screenFunctions } = useQuery({
    queryKey: ['screenFunctions', projectId],
    queryFn: async () => (await screenFunctionApi.getByProject(projectId)).data,
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error(t('worklogImport.errors.selectCsv', { defaultValue: 'Please select a CSV file' }));
      return taskWorkflowApi.previewWorklogImport(projectId, selectedFile);
    },
    onSuccess: (response) => {
      const data = response.data;
      setBatchDetail(data);
      setSelectedIds(data.items.filter((item) => item.isSelected).map((item) => item.id));
      setOverrides({});
      setEditingItemId(null);
      setEditDraft({});
      setCommitResult(null);
      setClearExistingTasks(false);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error(t('worklogImport.errors.noPreviewData', { defaultValue: 'No preview data' }));
      const overridePayload = Object.entries(overrides)
        .map(([itemId, value]) => ({ itemId: Number(itemId), ...value }))
        .filter((x) => x.stageId || x.stepId || x.screenFunctionId);

      const response = await taskWorkflowApi.commitWorklogImport({
        batchId: batchDetail.batch.id,
        selectedItemIds: selectedIds,
        overrides: overridePayload,
        clearExistingTasks,
      });
      const refreshed = await taskWorkflowApi.getWorklogImportBatch(batchDetail.batch.id);
      setBatchDetail(refreshed.data);
      return response;
    },
    onSuccess: (response) => {
      setCommitResult(response.data);
    },
  });

  const createScreenFunctionMutation = useMutation({
    mutationFn: async ({ itemId, suggestedName }: { itemId: number; suggestedName: string }) => {
      const defaultOrder = (screenFunctions?.length || 0) + 1;
      const response = await screenFunctionApi.create({
        projectId,
        name: suggestedName,
        type: 'Function',
        priority: 'Medium',
        complexity: 'Medium',
        estimatedEffort: 0,
        actualEffort: 0,
        progress: 0,
        status: 'Not Started',
        displayOrder: defaultOrder,
      });
      await queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      return { itemId, createdId: response.data.id };
    },
    onSuccess: ({ itemId, createdId }) => {
      setOverrides((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          screenFunctionId: createdId,
        },
      }));
      if (editingItemId === itemId) {
        setEditDraft((prev) => ({ ...prev, screenFunctionId: createdId }));
      }
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error(t('worklogImport.errors.noBatchToExport', { defaultValue: 'No batch to export' }));
      const response = await taskWorkflowApi.exportUnselectedWorklogImport(batchDetail.batch.id);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `worklog-import-unselected-${batchDetail.batch.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const stageOptions = config?.stages || [];

  const getEffectiveValue = (itemId: number, key: keyof ItemOverride, fallback?: number) =>
    overrides[itemId]?.[key] ?? fallback;

  const itemCanSelect = (item: any) => {
    const effectiveStepId = getEffectiveValue(item.id, 'stepId', item.stepId);
    const effectiveScreenFunctionId = getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId);
    return !!item.memberId && !!effectiveStepId && !!effectiveScreenFunctionId;
  };

  const updateOverride = (itemId: number, patch: ItemOverride) => {
    setOverrides((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const parseOptionalNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  };

  const getStatusColor = (status: string) => {
    if (status === 'ready' || status === 'committed') return 'success';
    if (status === 'needs_review') return 'warning';
    if (status === 'error' || status === 'unmapped') return 'error';
    return 'default';
  };

  const buildSuggestedScreenFunctionName = (workDetail?: string) => {
    const normalized = (workDetail || '')
      .replace(/\bgsl-\d+\b/gi, '')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized.slice(0, 120) || `Imported Function ${Date.now()}`;
  };

  const openEditModal = (item: any) => {
    setEditingItemId(item.id);
    setEditDraft({
      stageId: getEffectiveValue(item.id, 'stageId', item.stageId),
      stepId: getEffectiveValue(item.id, 'stepId', item.stepId),
      screenFunctionId: getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId),
    });
  };

  const closeEditModal = () => {
    setEditingItemId(null);
    setEditDraft({});
  };

  const saveEditModal = () => {
    if (!editingItemId) return;
    updateOverride(editingItemId, editDraft);
    closeEditModal();
  };

  const editingItem = batchDetail?.items.find((item) => item.id === editingItemId) || null;
  const editingStage = stageOptions.find((s: any) => s.id === Number(editDraft.stageId));
  const editingStepOptions = editingStage?.steps || [];

  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const items = batchDetail?.items || [];
    if (!sortColumn) return items;

    return [...items].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortColumn === 'day') {
        aVal = a.day || '';
        bVal = b.day || '';
      } else if (sortColumn === 'stageStep') {
        const aStageId = overrides[a.id]?.stageId ?? a.stageId;
        const bStageId = overrides[b.id]?.stageId ?? b.stageId;
        const aStepId = overrides[a.id]?.stepId ?? a.stepId;
        const bStepId = overrides[b.id]?.stepId ?? b.stepId;
        const aStage = stageOptions.find((s: any) => s.id === Number(aStageId));
        const bStage = stageOptions.find((s: any) => s.id === Number(bStageId));
        const aStep = aStage?.steps?.find((sp: any) => sp.id === Number(aStepId));
        const bStep = bStage?.steps?.find((sp: any) => sp.id === Number(bStepId));
        aVal = `${aStage?.name || ''} ${aStep?.name || ''}`.trim();
        bVal = `${bStage?.name || ''} ${bStep?.name || ''}`.trim();
      } else if (sortColumn === 'screenFunction') {
        const aFnId = overrides[a.id]?.screenFunctionId ?? a.screenFunctionId;
        const bFnId = overrides[b.id]?.screenFunctionId ?? b.screenFunctionId;
        aVal = (screenFunctions || []).find((sf: any) => sf.id === Number(aFnId))?.name || a.screenFunction?.name || '';
        bVal = (screenFunctions || []).find((sf: any) => sf.id === Number(bFnId))?.name || b.screenFunction?.name || '';
      } else if (sortColumn === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }

      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [batchDetail, sortColumn, sortDirection, overrides, stageOptions, screenFunctions]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('worklogImport.title', { defaultValue: 'Import CSV Worklog' })}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('worklogImport.description', { defaultValue: 'Upload CSV to preview, select records to import into StepScreenFunctionMember, then confirm commit.' })}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button variant="contained" onClick={() => previewMutation.mutate()} disabled={!selectedFile || previewMutation.isPending}>
            {t('worklogImport.actions.preview', { defaultValue: 'Preview' })}
          </Button>
          {batchDetail && (
            <>
              <Button variant="contained" color="success" onClick={() => commitMutation.mutate()} disabled={selectedIds.length === 0 || commitMutation.isPending}>
                {t('worklogImport.actions.commitSelected', { defaultValue: 'Commit Selected' })} ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                {t('worklogImport.actions.exportUnselected', { defaultValue: 'Export Unselected' })}
              </Button>
            </>
          )}
        </Box>

        {batchDetail && (
          <Box sx={{ mb: 2 }}>
            <Checkbox
              checked={clearExistingTasks}
              onChange={(e) => setClearExistingTasks(e.target.checked)}
            />
            {t('worklogImport.actions.clearExistingTasks', { defaultValue: 'Clear all existing tasks before import' })}
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', ml: 4 }}>
              {t('worklogImport.actions.clearExistingTasksHint', { defaultValue: 'Warning: this will remove all existing Step/Screen assignments in current project before import.' })}
            </Typography>
          </Box>
        )}

        {previewMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t('worklogImport.errors.previewFailed', { defaultValue: 'Preview failed' })}</Alert>}
        {commitMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t('worklogImport.errors.commitFailed', { defaultValue: 'Commit failed' })}</Alert>}

        {commitResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('worklogImport.commitResult', { defaultValue: 'Commit result: success {{success}}, failed {{failed}}, skipped {{skipped}}, total {{total}}', success: commitResult.success, failed: commitResult.failed, skipped: commitResult.skipped, total: commitResult.total })}
          </Alert>
        )}

        {batchDetail && (
          <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip label={t('worklogImport.summary.total', { defaultValue: 'Total: {{value}}', value: batchDetail.summary.total })} />
              <Chip color="success" label={t('worklogImport.summary.ready', { defaultValue: 'Ready: {{value}}', value: batchDetail.summary.ready })} />
              <Chip color="warning" label={t('worklogImport.summary.needsReview', { defaultValue: 'Needs review: {{value}}', value: batchDetail.summary.needsReview })} />
              <Chip color="error" label={t('worklogImport.summary.unmapped', { defaultValue: 'Unmapped: {{value}}', value: batchDetail.summary.unmapped })} />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('worklogImport.hintUseEditModal', { defaultValue: 'Click Edit to open popup for Stage/Step/Screen Function mapping per row.' })}
            </Typography>

            <DataTable
              columns={[
                {
                  key: 'day',
                  header: t('worklogImport.table.day', { defaultValue: 'Day' }),
                  sortable: true,
                  render: (item) => item.day || '-',
                },
                {
                  key: 'email',
                  header: t('worklogImport.table.email', { defaultValue: 'Email' }),
                  render: (item) => (
                    <Box sx={{ minWidth: 100, wordBreak: 'break-all' }}>{item.email || '-'}</Box>
                  ),
                },
                {
                  key: 'workDetail',
                  header: t('worklogImport.table.workDetail', { defaultValue: 'Work detail' }),
                  render: (item) => <Box sx={{ maxWidth: 320 }}>{item.workDetail || '-'}</Box>,
                },
                {
                  key: 'member',
                  header: t('worklogImport.table.member', { defaultValue: 'Member' }),
                  render: (item) => item.member?.name || '-',
                },
                {
                  key: 'stageStep',
                  header: t('worklogImport.table.stageStep', { defaultValue: 'Stage / Step' }),
                  sortable: true,
                  render: (item) => {
                    const effectiveStageId = getEffectiveValue(item.id, 'stageId', item.stageId);
                    const effectiveStepId = getEffectiveValue(item.id, 'stepId', item.stepId);
                    const stage = stageOptions.find((s: any) => s.id === Number(effectiveStageId));
                    const stepName = stage?.steps?.find((sp: any) => sp.id === Number(effectiveStepId))?.name || item.step?.name || '-';
                    return (
                      <Box sx={{ minWidth: 100 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage?.name || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">{stepName}</Typography>
                      </Box>
                    );
                  },
                },
                {
                  key: 'screenFunction',
                  header: t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' }),
                  sortable: true,
                  render: (item) => {
                    const effectiveScreenFunctionId = getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId);
                    const screenFunctionName =
                      (screenFunctions || []).find((sf: any) => sf.id === Number(effectiveScreenFunctionId))?.name ||
                      item.screenFunction?.name || '-';
                    return (
                      <Box sx={{ minWidth: 100 }}>
                        <Typography variant="body2">{screenFunctionName}</Typography>
                      </Box>
                    );
                  },
                },
                {
                  key: 'minutes',
                  header: t('worklogImport.table.minutes', { defaultValue: 'Minutes' }),
                  render: (item) => item.minutes || 0,
                },
                {
                  key: 'status',
                  header: t('worklogImport.table.status', { defaultValue: 'Status' }),
                  sortable: true,
                  render: (item) => (
                    <Chip size="small" color={getStatusColor(item.status) as any} label={item.status} />
                  ),
                },
                {
                  key: 'reason',
                  header: t('worklogImport.table.reason', { defaultValue: 'Reason' }),
                  render: (item) => <Box sx={{ maxWidth: 260 }}>{item.reason || '-'}</Box>,
                },
                {
                  key: 'action',
                  header: t('worklogImport.table.action', { defaultValue: 'Action' }),
                  align: 'center',
                  render: (item) => (
                    <Button size="small" variant="outlined" onClick={() => openEditModal(item)}>
                      {t('common.edit')}
                    </Button>
                  ),
                },
              ] as ColumnDef<any>[]}
              data={sortedItems}
              keyExtractor={(item) => item.id}
              stickyHeader
              maxHeight={460}
              selectable
              selectedKeys={selectedIds}
              onSelectionChange={(keys) => setSelectedIds(keys as number[])}
              isRowSelectable={itemCanSelect}
              sortBy={sortColumn ?? undefined}
              sortOrder={sortDirection}
              onSort={(col) => handleSort(col as SortColumn)}
            />
          </>
        )}

        <Modal
          isOpen={!!editingItem}
          onClose={closeEditModal}
          title={t('worklogImport.editModal.title', { defaultValue: 'Edit mapping for row #{{row}}', row: editingItem?.rowNumber || '-' })}
          size="sm"
          footer={(
            <>
              <Button color="inherit" onClick={closeEditModal}>{t('common.cancel')}</Button>
              <Button variant="contained" onClick={saveEditModal}>{t('common.save')}</Button>
            </>
          )}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingItem?.workDetail || '-'}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              select
              size="small"
              label={t('taskWorkflow.stage', { defaultValue: 'Stage' })}
              value={editDraft.stageId || ''}
              onChange={(e) => setEditDraft((prev) => ({
                ...prev,
                stageId: parseOptionalNumber(e.target.value),
                stepId: undefined,
              }))}
            >
              <MenuItem value="">-</MenuItem>
              {stageOptions.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label={t('taskWorkflow.step', { defaultValue: 'Step' })}
              value={editDraft.stepId || ''}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, stepId: parseOptionalNumber(e.target.value) }))}
            >
              <MenuItem value="">-</MenuItem>
              {editingStepOptions.map((sp: any) => (
                <MenuItem key={sp.id} value={sp.id}>{sp.name}</MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                size="small"
                label={t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' })}
                fullWidth
                value={editDraft.screenFunctionId || ''}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, screenFunctionId: parseOptionalNumber(e.target.value) }))}
              >
                <MenuItem value="">-</MenuItem>
                {(screenFunctions || []).map((sf: any) => (
                  <MenuItem key={sf.id} value={sf.id}>{sf.name}</MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  editingItem && createScreenFunctionMutation.mutate({
                    itemId: editingItem.id,
                    suggestedName: buildSuggestedScreenFunctionName(editingItem.workDetail),
                  })
                }
                disabled={createScreenFunctionMutation.isPending || !editingItem}
              >
                +
              </Button>
            </Box>
          </Box>
        </Modal>
      </CardContent>
    </Card>
  );
}
